import asyncio
import edge_tts

async def test():
    text = "Hola, esta es una prueba de conexión."
    voice = "es-MX-JorgeNeural"
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save("test_connection.mp3")
    print("Success")

if __name__ == "__main__":
    asyncio.run(test())
