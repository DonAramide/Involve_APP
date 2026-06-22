import os

artifacts_dir = r"C:\Users\IIPS\.gemini\antigravity\brain\f6abfa43-41a3-4b4e-8428-774175a2199e"
phrase = "P0-5C implementation"

for root, dirs, files in os.walk(artifacts_dir):
    for file in files:
        if file.endswith('.md') or file.endswith('.json'):
            path = os.path.join(root, file)
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    if phrase in content or "may proceed" in content:
                        print(f"Found in: {path}")
                        # print surrounding context
                        idx = content.find(phrase)
                        if idx != -1:
                            print(content[max(0, idx-100):min(len(content), idx+200)])
                        else:
                            idx_proceed = content.find("may proceed")
                            print(content[max(0, idx_proceed-100):min(len(content), idx_proceed+200)])
            except Exception as e:
                pass
