import os
from pdfminer.high_level import extract_text
import glob

def run():
    # Try exact match first
    filename = "Proposta_Investimento_Consorcio_1,5 INTEGRAL.pdf"
    
    if not os.path.exists(filename):
        print(f"File '{filename}' not found. Searching directory...")
        files = glob.glob("*.pdf")
        print(f"PDFs found: {files}")
        # Try to find one that matches closely
        matches = [f for f in files if "Proposta" in f and "INTEGRAL" in f]
        if matches:
            filename = matches[0]
            print(f"Using found file: {filename}")
        else:
            print("No matching PDF found.")
            return

    try:
        print(f"Extracting text from: {filename}")
        text = extract_text(filename)
        print("--- CONTENT START ---")
        print(text)
        print("--- CONTENT END ---")
    except Exception as e:
        print(f"Error extracting: {e}")

if __name__ == "__main__":
    run()
