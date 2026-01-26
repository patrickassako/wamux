import re
import os

SOURCE_FILE = "/Users/apple/Documents/whatsappAPI/_bmad-output/planning-artifacts/epics.md"
OUTPUT_BASE = "/Users/apple/Documents/whatsappAPI/_bmad-output/planning-artifacts/Epics"

def clean_filename(text):
    # Remove emojis if any (basic check)
    text = text.encode('ascii', 'ignore').decode('ascii')
    # Replace simple chars
    text = text.replace("&", "and").replace("/", "-").replace(":", "").replace("(", "").replace(")", "").replace(",", "")
    text = text.strip().replace(" ", "-")
    return text

def parse_and_create():
    if not os.path.exists(SOURCE_FILE):
        print(f"File not found: {SOURCE_FILE}")
        return

    with open(SOURCE_FILE, "r") as f:
        lines = f.readlines()

    current_epic_dir = None
    current_story_file = None
    current_story_content = []
    
    current_epic_title = ""

    for line in lines:
        stripped = line.strip()
        
        # Detect Epic Header
        epic_match = re.match(r"^### Epic (\d+): (.+)", stripped)
        if epic_match:
            # Save previous story if open
            if current_story_file and current_story_content:
                with open(current_story_file, "w") as f_out:
                    f_out.write("".join(current_story_content))
                current_story_file = None
                current_story_content = []

            epic_id = epic_match.group(1)
            epic_name = epic_match.group(2)
            clean_name = clean_filename(epic_name)
            dir_name = f"Epic-{epic_id.zfill(2)}-{clean_name}"
            current_epic_dir = os.path.join(OUTPUT_BASE, dir_name)
            current_epic_title = f"Epic {epic_id}: {epic_name}"
            
            os.makedirs(current_epic_dir, exist_ok=True)
            print(f"Created Directory: {current_epic_dir}")
            
            # We don't write Epic content to a file here, assuming user wants story files inside.
            # Usually Epics have a Description/Goal. Let's create an README.md or 00-Overview.md in the Epic folder?
            # User said "Epic detail avec des fichier storys".
            # Let's start capturing content for the Epic Overview until the first story hits.
            current_story_file = os.path.join(current_epic_dir, "00-Epic-Overview.md")
            current_story_content = [f"# {stripped}\n"]
            continue

        # Detect Story Header
        story_match = re.match(r"^### Story (\d+\.\d+): (.+)", stripped)
        if story_match:
             # Save previous story/overview
            if current_story_file and current_story_content:
                with open(current_story_file, "w") as f_out:
                    f_out.write("".join(current_story_content))
                print(f"Saved: {os.path.basename(current_story_file)}")

            story_id = story_match.group(1)
            story_name = story_match.group(2)
            clean_name = clean_filename(story_name)
            
            if not current_epic_dir:
                print("Warning: Story found before Epic")
                continue
                
            fname = f"Story-{story_id}-{clean_name}.md"
            current_story_file = os.path.join(current_epic_dir, fname)
            current_story_content = [f"# {stripped}\n"] # Use H1 for file title
            continue
            
        # Accumulate content
        if current_story_file:
            current_story_content.append(line)

    # Save last file
    if current_story_file and current_story_content:
        with open(current_story_file, "w") as f_out:
            f_out.write("".join(current_story_content))
        print(f"Saved: {os.path.basename(current_story_file)}")

if __name__ == "__main__":
    parse_and_create()
