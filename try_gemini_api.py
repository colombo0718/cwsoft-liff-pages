import os
from google import genai

client = genai.Client(api_key="AIzaSyDpR8C64EyDetExxlBT7j2dZ89cSyS4EJQ")

resp = client.models.generate_content(
    model="gemini-2.0-flash",
    contents="請用簡單方式解釋什麼是強化式學習"
)

print(resp.text)