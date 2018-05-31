// BANG & OLUFSEN
// Elements

function systemDataReceiver(content) {
	
}

function powerManage(operation) {
	/*
	0: Shut down
	1: Restart
	*/
	switch (operation) {
		case 0:
			sendToProduct({header: "system", content: {operation: "shutDown"}});
			ask();
			break;
		case 1:
			sendToProduct({header: "system", content: {operation: "restart"}});
			ask();
			break;
	}
}