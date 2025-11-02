import aiohttp
import json
from typing import Dict, List, Any, Optional
from datetime import datetime
from config_reader import config


class YandexDiskAPI:
    """Класс для работы с Яндекс.Диском через REST API"""
    
    def __init__(self, token: str):
        self.token = token
        self.base_url = "https://cloud-api.yandex.net/v1/disk"
        self.headers = {
            "Authorization": f"OAuth {token}",
            "Accept": "application/json"
        }
    
    async def _request(self, method: str, url: str, **kwargs) -> Dict[str, Any]:
        """Выполняет HTTP запрос"""
        async with aiohttp.ClientSession() as session:
            async with session.request(method, url, headers=self.headers, **kwargs) as response:
                response.raise_for_status()
                return await response.json()
    
    async def download_file(self, remote_path: str) -> bytes:
        """Скачивает файл с Яндекс.Диска"""
        url = f"{self.base_url}/resources/download"
        params = {"path": remote_path}
        response_data = await self._request("GET", url, params=params)
        download_url = response_data["href"]
        
        async with aiohttp.ClientSession() as session:
            async with session.get(download_url) as response:
                response.raise_for_status()
                return await response.read()
    
    async def upload_file(self, local_data: bytes, remote_path: str, overwrite: bool = True) -> None:
        """Загружает файл на Яндекс.Диск"""
        # Получаем URL для загрузки
        url = f"{self.base_url}/resources/upload"
        params = {"path": remote_path, "overwrite": str(overwrite).lower()}
        response_data = await self._request("GET", url, params=params)
        upload_url = response_data["href"]
        
        # Загружаем файл
        async with aiohttp.ClientSession() as session:
            async with session.put(upload_url, data=local_data) as response:
                response.raise_for_status()
    
    async def copy_file(self, from_path: str, to_path: str) -> Dict[str, Any]:
        """Копирует файл на Яндекс.Диске"""
        url = f"{self.base_url}/resources/copy"
        params = {"from": from_path, "path": to_path, "overwrite": "true"}
        return await self._request("POST", url, params=params)
    
    async def get_file_info(self, remote_path: str) -> Dict[str, Any]:
        """Получает информацию о файле (включая дату модификации)"""
        url = f"{self.base_url}/resources"
        params = {"path": remote_path}
        return await self._request("GET", url, params=params)
    
    async def delete_file(self, remote_path: str) -> None:
        """Удаляет файл с Яндекс.Диска"""
        url = f"{self.base_url}/resources"
        params = {"path": remote_path, "permanently": "true"}
        await self._request("DELETE", url, params=params)


