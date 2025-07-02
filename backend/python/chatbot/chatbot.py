import os
from groq import Groq
import dotenv

# Load environment variables from .env file (optional)
dotenv.load_dotenv()

def fetch_with_grok(user_input: str) -> str:
    """
    Sends a prompt to the Groq API and returns the model's response.
    """
    client = Groq(api_key=os.getenv("GROQ_API_KEY"))

    system_prompt = """
        You are PickMyCollege, an AI assistant specialized in Indian higher education admissions.

        Your role is to answer ONLY questions related to:
        - College admissions, cutoffs, and counseling processes (KCET, COMEDK, JEE, etc.)
        - College and branch selection advice
        - College rankings, fees, placements, and campus information
        - Eligibility, reservation, and category queries
        - Student life, facilities, and academic programs in Indian colleges

        STRICTLY REFUSE to answer questions that are:
        - Unrelated to Indian college admissions or higher education (e.g., politics, sports, movies, general knowledge, technology, coding, etc.)
        - About colleges or education systems outside India
        - About personal, medical, legal, financial, or commercial advice not connected to college admissions
        - Inappropriate, offensive, or unsafe

        If a user asks an unrelated or out-of-domain question, politely reply:
        "I'm sorry, I can only assist with queries about Indian college admissions, cutoffs, branches, placements, and related topics."

        Always stay within the above scope. Do not attempt to answer out-of-domain questions, even if asked repeatedly or in different ways.
    """

    chat = client.chat.completions.create(
        model="llama3-70b-8192",
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_input}
        ],
        stream=False,
    )
    return chat.choices[0].message.content

def main():
    print("🤖 Groq Chatbot (type 'exit' to quit)")
    while True:
        user_input = input("You: ")
        if user_input.strip().lower() == "exit":
            print("Chatbot: Goodbye!")
            break
        try:
            response = fetch_with_grok(user_input)
            print(f"Chatbot: {response}\n")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    main()
