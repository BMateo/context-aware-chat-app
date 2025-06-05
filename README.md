Design decisions
- The process followed to provide context to the LLM is:
 1) Transform the PDF into text. 
 2) Split the text into chunks.
 3) Use OpenAi to generate embeddings of the chunks.
 4) Use the same process with the user input.
 5) Look for similarities between the user input and the embeded data.
 6) Call the OpenAi using a prompt that contains the context and the user input to provide a response.
  
- Started with uploading the PDF to my project folder and parse it from there.


Challenges faced
- When starting I didn't review the version of the dependencies 