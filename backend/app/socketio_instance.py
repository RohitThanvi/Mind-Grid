# app/socketio_instance.py - FINAL CORRECTED VERSION

import socketio

# Define the explicit list of allowed origins (MUST match main.py and your frontend URL)
origins = [
    "http://localhost:5173", # Local development
    "https://minddeploy1-1.onrender.com", # Your production frontend URL
    # Add any other origins if needed
]

import socketio

sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*'
)
# NOTE: Ensure this 'sio' instance is imported and used in matchmaking.py and main.py