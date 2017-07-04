# BeoLink S
BeoLink S is a Node.js server that interacts with shairport-sync and other utilies to provide a seamless setup and use experience of a Raspberry Pi-based sound system. It connects to clients using websockets.

Features:
* Keeps track of different AirPlay sources that connect to the system (by reading shairport-sync metadata and discovering the sources via Bonjour).
* Connects to its client application using websockets. Communication is bi-directional and works using strings, with simple 4-character codes indentifying the "payload".
* Allows controlling AirPlay sources (play/pause, skipping tracks, volume control).
* Supplies information to the clients (track info, album art, volume levels, available sources, and so on).
* Works with Bang & Olufsen Beo4 remote control when an IR receiver is connected to the system.
* Can be used to configure Wi-Fi networks, making headless operation effortless.
