"""
Client to call the Whisper API server from your React Native app.
"""

import aiohttp
import asyncio
from pathlib import Path
from typing import Optional, Dict, Any


class WhisperAPIClient:
    """Client for communicating with Whisper API server."""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        """
        Initialize the API client.
        
        Args:
            base_url: API server URL (default: local)
        """
        self.base_url = base_url.rstrip("/")
    
    async def health(self) -> Dict[str, Any]:
        """Check API health."""
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{self.base_url}/health") as response:
                return await response.json()
    
    async def transcribe(
        self,
        audio_path: str,
        language: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Transcribe audio file.
        
        Args:
            audio_path: Path to audio file
            language: Optional language code ('en' or 'ur')
        
        Returns:
            Transcription response
        """
        if not Path(audio_path).exists():
            raise FileNotFoundError(f"Audio file not found: {audio_path}")
        
        url = f"{self.base_url}/transcribe"
        params = {}
        if language:
            params["language"] = language
        
        async with aiohttp.ClientSession() as session:
            with open(audio_path, "rb") as f:
                form = aiohttp.FormData()
                form.add_field("file", f, filename=Path(audio_path).name)
                
                async with session.post(url, data=form, params=params) as response:
                    if response.status != 200:
                        error = await response.text()
                        raise Exception(f"API error: {error}")
                    return await response.json()


# Example usage
async def main():
    """Example of using the API client."""
    client = WhisperAPIClient()
    
    # Check health
    health = await client.health()
    print(f"API Health: {health}")
    
    # Transcribe a file
    # result = await client.transcribe("path/to/audio.wav", language="en")
    # print(f"Transcription: {result['text']}")


if __name__ == "__main__":
    asyncio.run(main())
