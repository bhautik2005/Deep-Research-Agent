from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
import json, asyncio, os, sys

app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")


class TopicRequest(BaseModel):
    topic: str


def event(step: str, status: str, content: str = "", error: str = "") -> str:
    return f"data: {json.dumps({'step': step, 'status': status, 'content': content, 'error': error})}\n\n"


async def run_pipeline(topic: str):
    # Lazy load agents to speed up application startup time
    from agents import build_search_agent, build_reader_agent, writer_chain, critic_chain
    
    loop = asyncio.get_event_loop()
    state = {}

    # ── Step 1: Search Agent ─────────────────────────────────
    yield event("search", "start")
    try:
        def do_search():
            search_agent = build_search_agent()
            result = search_agent.invoke({
                "messages": [("user", f"Find recent reliable and Detailed information About: {topic}")]
            })
            return result['messages'][-1].content

        state['search_results'] = await loop.run_in_executor(None, do_search)
        yield event("search", "done", state['search_results'])
    except Exception as e:
        yield event("search", "error", error=str(e))
        return

    # ── Step 2: Reader Agent ─────────────────────────────────
    yield event("reader", "start")
    try:
        def do_read():
            reader_agent = build_reader_agent()
            result = reader_agent.invoke({
                "messages": [("user",
                    f"base on the search results about {topic}"
                    f"pick the most relevant URL and read it for deeper insights.\n\n"
                    f"Read and extract key insights from the following search results: {state['search_results'][:800]}"
                )]
            })
            return result['messages'][-1].content

        state['screped_content'] = await loop.run_in_executor(None, do_read)
        yield event("reader", "done", state['screped_content'])
    except Exception as e:
        yield event("reader", "error", error=str(e))
        return

    # ── Step 3: Writer Chain ─────────────────────────────────
    yield event("writer", "start")
    try:
        def do_write():
            research_combine = (
                f"Search Results:\n{state['search_results']}\n\n"
                f"Scraped Content:\n{state['screped_content']}"
            )
            return writer_chain.invoke({"topic": topic, "research": research_combine})

        state['Report'] = await loop.run_in_executor(None, do_write)
        yield event("writer", "done", state['Report'])
    except Exception as e:
        yield event("writer", "error", error=str(e))
        return

    # ── Step 4: Critic Chain ─────────────────────────────────
    yield event("critic", "start")
    try:
        def do_critic():
            return critic_chain.invoke({"report": state['Report']})

        state['Critic Feedback'] = await loop.run_in_executor(None, do_critic)
        yield event("critic", "done", state['Critic Feedback'])
    except Exception as e:
        yield event("critic", "error", error=str(e))
        return

    yield event("pipeline", "done")

@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse(request=request, name="index.html")


@app.post("/run")
async def run(body: TopicRequest):
    return StreamingResponse(
        run_pipeline(body.topic),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}
    )
