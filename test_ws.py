import asyncio
import websockets

async def test():
    try:
        async with websockets.connect('ws://localhost:8000/api/ws/command-center') as ws:
            msg = await ws.recv()
            print("Received:", msg[:100])
    except Exception as e:
        print("Error:", e)

asyncio.run(test())
