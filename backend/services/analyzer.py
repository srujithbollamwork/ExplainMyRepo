import os
import shutil
import tempfile
import json
import ast
from urllib.parse import urlparse
import git
from groq import Groq

import time

from firebase_admin import firestore
from database import get_firestore_db

# Initialize Groq Client
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
MODEL_FAST = os.getenv("GROQ_FALLBACK_MODEL", "llama-3.1-8b-instant")
MODEL_SMART = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

def get_groq_client():
    key = os.getenv("GROQ_API_KEY")
    if not key:
        return None
    return Groq(api_key=key)

client = get_groq_client()

# File types we actually want to read to avoid huge binaries or irrelevant assets
ALLOWED_EXTENSIONS = {
    ".py", ".js", ".jsx", ".ts", ".tsx", ".html", ".css", ".java", 
    ".c", ".cpp", ".h", ".go", ".rs", ".ruby", ".php", ".md", ".json"
}

def analyze_repo(repo_id: str, clone_url: str):
    db = get_firestore_db()
    if not db:
        print("Firestore not available. Skipping analysis.")
        return

    global client
    if not client:
        client = get_groq_client()
        
    if not client:
        print("Groq client not available. Skipping analysis.")
        return

    doc_ref = db.collection('repos').document(repo_id)
    doc_ref.update({"status": "cloning", "description": "Cloning repository..."})

    temp_dir = tempfile.mkdtemp()
    try:
        # 1. Clone the repository
        print(f"Cloning {clone_url} into {temp_dir}")
        git.Repo.clone_from(clone_url, temp_dir, depth=1)
        
        doc_ref.update({"status": "analyzing_files", "description": "Reading and summarizing files..."})
        file_summaries = []
        files_collection = doc_ref.collection('files')
        file_count = 0
        MAX_FILES = 50
        
        for root, dirs, files in os.walk(temp_dir):
            if file_count >= MAX_FILES:
                break
            dirs[:] = [d for d in dirs if not d.startswith('.')]
            
            for file in files:
                if file_count >= MAX_FILES:
                    break
                if file.startswith('.'):
                    continue
                    
                _, ext = os.path.splitext(file)
                if ext.lower() not in ALLOWED_EXTENSIONS and file != "Dockerfile" and file != "Makefile":
                    continue
                    
                file_path = os.path.join(root, file)
                rel_path = os.path.relpath(file_path, temp_dir)
                
                try:
                    with open(file_path, "r", encoding="utf-8") as f:
                        content = f.read()
                        
                    if len(content) > 10000:
                        content = content[:10000] + "\n...[TRUNCATED]"

                    deps = extract_dependencies(content, ext)
                        
                    prompt = f"Analyze this file named '{rel_path}' and provide a concise 2-sentence summary of its purpose in the overall architecture.\n\nCode:\n{content}"
                    
                    try:
                        completion = client.chat.completions.create(
                            model=MODEL_FAST,
                            messages=[
                                {"role": "system", "content": "Analyze the provided file and provide a concise 2-sentence summary."},
                                {"role": "user", "content": prompt}
                            ]
                        )
                        summary = completion.choices[0].message.content
                        # Rate limit protection
                        time.sleep(1) 
                    except Exception as ai_e:
                        print(f"AI summary failed for {rel_path}: {ai_e}")
                        summary = "Could not generate summary."

                    # Calculate simple metrics
                    lines = content.count('\n') + 1

                    # Save to Firestore
                    try:
                        files_collection.add({
                            "path": rel_path,
                            "name": file,
                            "type": "file",
                            "content_summary": summary,
                            "dependencies_json": json.dumps(deps),
                            "metrics": {
                                "lines": lines,
                                "complexity_score": len(deps) * 2 + (lines // 50)
                            }
                        })
                    except Exception as fs_e:
                        print(f"Firestore save failed for {rel_path}: {fs_e}")
                    
                    file_summaries.append(f"{rel_path}: {summary}")
                    file_count += 1
                    
                except Exception as e:
                    print(f"Error reading file {file_path}: {e}")
                    
        # 3. Generate Structured Architecture overview
        doc_ref.update({"status": "summarizing", "description": "Generating structured architecture components..."})
        
        architecture_prompt = (
            "Analyze the following repository file summaries and return a response in STRICT JSON format. "
            "Do not include any markdown hashes or stars in the values. Keep descriptions clean and professional.\n\n"
            "JSON structure:\n"
            "{\n"
            "  \"tech_stack\": [\"List\", \"of\", \"Technologies\"],\n"
            "  \"main_components\": [\n"
            "    {\"name\": \"Component Name\", \"purpose\": \"Concise purpose description\"}\n"
            "  ],\n"
            "  \"data_flow\": \"Description of how data moves through the system\"\n"
            "}\n\n"
            "File summaries:\n"
            + "\n".join(file_summaries[:100])
        )
        
        try:
            print("Generating architecture overview with Smart Model...")
            completion = client.chat.completions.create(
                model=MODEL_SMART,
                messages=[
                    {"role": "system", "content": "You are a senior software architect. Generate a high-level architecture overview based on the provided file summaries. Return ONLY valid JSON."},
                    {"role": "user", "content": architecture_prompt}
                ]
            )
            raw_content = completion.choices[0].message.content
            
            # Attempt to clean and parse JSON
            try:
                # Remove markdown code blocks if present
                clean_json = raw_content
                if "```json" in clean_json:
                    clean_json = clean_json.split("```json")[-1].split("```")[0].strip()
                elif "```" in clean_json:
                    clean_json = clean_json.split("```")[-1].split("```")[0].strip()
                
                arch_data = json.loads(clean_json)
                doc_ref.update({
                    "status": "completed",
                    "description": "Analysis complete.",
                    "architecture_structured": arch_data,
                    "architecture_summary": raw_content # Keep raw as fallback
                })
            except Exception as e:
                print(f"JSON parse error: {e}")
                doc_ref.update({
                    "status": "completed",
                    "description": "Analysis complete.",
                    "architecture_summary": raw_content
                })
        except Exception as ai_e:
            print(f"AI architecture failed: {ai_e}")
            doc_ref.update({
                "status": "completed",
                "description": "Analysis complete.",
                "architecture_summary": "Analysis failed to generate summary."
            })
        
    except Exception as e:
        print(f"Repository analysis failed: {e}")
        doc_ref.update({
            "status": "failed",
            "description": f"Error: {str(e)}"
        })
        
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


def extract_dependencies(content: str, ext: str) -> list:
    deps = []
    if ext == '.py':
        try:
            tree = ast.parse(content)
            for node in ast.walk(tree):
                if isinstance(node, ast.Import):
                    for alias in node.names:
                        deps.append(alias.name)
                elif isinstance(node, ast.ImportFrom):
                    if node.module:
                        deps.append(node.module)
        except:
            pass
    return deps
