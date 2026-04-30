from agents import build_search_agent, build_reader_agent, writer_chain, critic_chain

def run_research_pipeline(topic):
    
    state = {}
    
    #serach agents  working 
    print("\n"+"="*50)
    print("step-1 serch agent working...")
    print("="*50)

    search_agent = build_search_agent()
    search_results = search_agent.invoke({
        "messages": [("user", f"Find recent reliable and Detailed information About: {topic}")]
    })
    state['search_results'] = search_results['messages'][-1].content  
    
    print("\n serch Results:", state['search_results'])
    
    #step2 reader agent working
    print("\n"+"="*50)
    print("setp-2 reader agent working...")   
    print("="*50)
    
    reader_agent = build_reader_agent()
    reader_results = reader_agent.invoke({
        "messages": [("user", 
        f"base on the search results about {topic}"
        f"pick the most relevant URL and read it for deeper insights.\n\n"
        f"Read and extract key insights from the following search results: {state['search_results'][:800]}")]
    })
    
    state['screped_content'] = reader_results['messages'][-1].content
    
    print("\n screped_content \n:", state['screped_content'])
    
    
    #step-3 writer chain working
    
    print("\n"+"="*50)
    print("setp-3 writer drfting the report ...")
    
    recharch_combine = (
        f"Search Results:\n{state['search_results']}\n\n"
        f"Scraped Content:\n{state['screped_content']}"
    )
    
    state["Reoprt"]=writer_chain.invoke({
        "topic": topic,
        "research": recharch_combine   
    })
    
    print("\n Drafted Report \n:", state['Reoprt'])
    
    # critic chain working
    print("\n"+"="*50)
    print("setp-4 critic evaluating the report ...")   
    print("="*50)
    
    state["Critic Feedback"]=critic_chain.invoke({
        "report": state["Reoprt"],
        
    })
    
    print("\n Critic Feedback \n:", state['Critic Feedback'])
    
    return state


if __name__ == "__main__":
    
    topic = input("Enter a research topic: ")
    run_research_pipeline(topic)
