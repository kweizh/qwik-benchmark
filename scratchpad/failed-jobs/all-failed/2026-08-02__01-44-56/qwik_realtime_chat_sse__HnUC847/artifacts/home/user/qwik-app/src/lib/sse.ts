export interface SSEClient {
  id: string;
  write: (data: string) => Promise<void>;
  close: () => void;
}

const clients = new Map<string, SSEClient>();

export function addClient(client: SSEClient) {
  clients.set(client.id, client);
}

export function removeClient(id: string) {
  const client = clients.get(id);
  if (client) {
    client.close();
    clients.delete(id);
  }
}

export function broadcastMessage(message: any) {
  const data = `data: ${JSON.stringify(message)}\n\n`;
  for (const [id, client] of clients.entries()) {
    client.write(data).catch((err) => {
      console.error(`Failed to write to client ${id}, removing:`, err);
      removeClient(id);
    });
  }
}
