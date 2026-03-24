import os

def replace_in_dir(path, target, replacement):
    for root, dirs, files in os.walk(path):
        for file in files:
            if file.endswith('.tsx'):
                full_path = os.path.join(root, file)
                with open(full_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                if target in content:
                    new_content = content.replace(target, replacement)
                    with open(full_path, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                    print(f"Updated {full_path}")

replace_in_dir('client/src/components/admin', 'hide-scrollbar', 'custom-scrollbar')
replace_in_dir('client/src/screens', 'hide-scrollbar', 'custom-scrollbar')
