from langchain.tools import tool
import requests 
from bs4 import BeautifulSoup
from tavily import TavilyClient
import os
from rich import print
from dotenv import load_dotenv

load_dotenv()

tavily = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))


@tool
def web_search(query: str) -> str:
    """Search the web for recent and reliable information on the given query and Return Title,URL,snippets ."""
    
    result=tavily.search(query=query, num_results=3)
    
    out =[]
    
    for  i in result['results']:
        out.append(
            f"Title: {i['title']}\nURL: {i['url']}\nSnippet: {i['content'][:300]}\n")
        
    return "\n-----\n".join(out)

# print(web_search.invoke("What is the latest news on AI?"))

@tool
def scrape_url(url: str) -> str:
    """Scrape the content of the given URL and return the text content from given URL for deeper reading."""
    try:
        reap = requests.get(url,timeout=10, headers={'User-Agent': 'Mozilla/5.0'})
        soup = BeautifulSoup(reap.text, 'html.parser')
        for tag in soup(['script', 'style',"nav","footer"]):
            tag.decompose()
        
        return soup.get_text(separator='\n', strip=True)[:2000]  # Return first 2000 characters for deeper reading
    except Exception as e:
        return f"Error scraping URL: {str(e)}" 
    

# print(scrape_url.invoke("https://www.nbcnews.com/artificial-intelligence"))