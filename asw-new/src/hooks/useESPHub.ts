import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const ESPHUB_URL = 'https://esphub.mehtank.com';
const TARGET_JACKET = 'fox_jacket';

interface ESPHubMessage {
  sid: string;
  event: string;
  data: any;
}

export const useESPHub = () => {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [clientSid, setClientSid] = useState<string | null>(null);
  const [allClients, setAllClients] = useState<any[]>([]);

  useEffect(() => {
    console.log('Initializing ESPHub connection...');
    
    const socket = io(ESPHUB_URL, {
      path: '/socket.io/',
      transports: ['websocket', 'polling'],
      secure: true
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to ESPHub server');
      console.log('   Socket ID:', socket.id);
      setIsConnected(true);
      
      // Register this client (matching Python format)
      const registration = {
        mac: 'web_client',
        ip: 'browser',
        name: 'Jacket Design GUI',
        config: 'designer'
      };
      console.log('Registering client:', registration);
      socket.emit('register', registration);
      
      // Enter membership and request list (matching Python code)
      setTimeout(() => {
        console.log('Entering membership and requesting list...');
        socket.emit('enter', 'membership');
        socket.emit('list');
      }, 1000);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from ESPHub');
      setIsConnected(false);
      setClientSid(null);
      setAllClients([]);
    });

    socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
    });

    // Listen for list response (the server sends back client list)
    socket.on('list', (clientsData: any) => {
      console.log('Received list event:', clientsData);
      handleClientsList(clientsData);
    });

    // Listen for clients list
    socket.on('clients', (clientsData: any) => {
      console.log('Received clients event:', clientsData);
      handleClientsList(clientsData);
    });

    const handleClientsList = (clientsData: any) => {
      console.log('  Processing clients data:', clientsData);
      
      let clientArray: any[] = [];
      
      if (typeof clientsData === 'object' && clientsData !== null) {
        // Convert object format to array
        // Format: { 'sid': { name, mac, ip, config }, ... }
        clientArray = Object.entries(clientsData).map(([sid, data]: [string, any]) => ({
          sid,
          ...data
        }));
      } else if (Array.isArray(clientsData)) {
        clientArray = clientsData;
      }
      
      setAllClients(clientArray);
      console.log('   Total clients found:', clientArray.length);
      
      clientArray.forEach((client: any, index: number) => {
        console.log(`   Client ${index}:`, {
          name: client.name,
          sid: client.sid,
          mac: client.mac,
          ip: client.ip
        });
      });
      
      // Find fox_jacket
      const jacket = clientArray.find((c: any) => 
        c.name === TARGET_JACKET || 
        c.name?.toLowerCase().includes('fox')
      );
      
      if (jacket) {
        console.log('Found fox_jacket!');
        console.log('   Name:', jacket.name);
        console.log('   SID:', jacket.sid);
        console.log('   MAC:', jacket.mac);
        console.log('   IP:', jacket.ip);
        setClientSid(jacket.sid);
      } else {
        console.warn('⚠️ fox_jacket not found');
        console.log('   Available client names:', clientArray.map((c: any) => c.name || 'unnamed'));
      }
    };

    // Listen for ALL events to debug
    socket.onAny((eventName, ...args) => {
      console.log(`Event: "${eventName}"`, args);
    });

    return () => {
      console.log('Disconnecting from ESPHub');
      socket.disconnect();
    };
  }, []);

  // Function to manually refresh clients list
  const refreshClients = () => {
    if (socketRef.current && isConnected) {
      console.log('Manually refreshing clients list...');
      socketRef.current.emit('list');
    }
  };

  // Send command to jacket
  const sendCommand = (event: string, data: any) => {
    if (!socketRef.current || !isConnected) {
      console.warn('Socket not connected');
      return false;
    }

    if (!clientSid) {
      console.warn('Jacket SID not found');
      return false;
    }

    const packet: ESPHubMessage = {
      sid: clientSid,
      event: event,
      data: data
    };

    console.log('Sending command to jacket:');
    console.log('  Event:', event);
    console.log('  Data:', data);
    console.log('  Full packet:', JSON.stringify(packet, null, 2));
    
    socketRef.current.emit('command', packet);
    return true;
  };

  // Send LED animation based on placement and movement
  const sendLEDStripAnimation = (placement: string, movement: string, color: string) => {
    // Map GUI movement to jacket emotion
    const emotionMap: { [key: string]: string } = {
      'static': 'scared',      // Light On
      'flash': 'angry',        // Flash
      'runway': 'relaxed',     // Trickle Up
      'sad': 'sad',           // Trickle Down
      'twinkle': 'happy'      // Random Flash
    };

    console.log("Movement received:", movement);

    //const emotion = emotionMap[movement] || 'sleepy';
    
    // Determine the command based on placement
    let command: string;
    let commandColor: string;
    switch (placement) {
      case 'left-arm':
        command = 'npx_animation_L';
        commandColor = 'changecolor_L'; 
        break;
      case 'right-arm':
        command = 'npx_animation_R';
        commandColor = 'changecolor_R'; 
        break;
      case 'left-wrist':
        command = 'npx_animation_LW';
        commandColor = 'changecolor_LW'; 
        break;
      case 'right-wrist':
        command = 'npx_animation_RW';
        commandColor = 'changecolor_RW'; 
        break;
      default:
        command = 'npx_animation'; // fallback to general
    }

    console.log(`Sending ${command}("${movement}") for ${placement}`);
    const success = sendCommand(command, movement);

    // Send color change after animation
    if (success && color) {
      setTimeout(() => {
        sendColorChange(commandColor, color);
      }, 100); // Small delay to ensure animation command is processed first
    }

    return success;
  };

  // Parse RGB from color string and send changecolor command
  const sendColorChange = (colorComString: string, colorString: string) => {
    // Parse "rgb(227, 52, 58)" format (always RGB, no rgba)
    const rgbMatch = colorString.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    
    if (rgbMatch) {
      const r = rgbMatch[1];
      const g = rgbMatch[2];
      const b = rgbMatch[3];
      const colorCommand = `${r}${g}${b}`;
      
      console.log(`Sending changecolor("${colorCommand}")`);
      return sendCommand(colorComString, colorCommand);
    }
    
    console.warn('Could not parse RGB color:', colorString);
    return false;
  };

  // Battery level command
  const sendBatteryLevel = (level: number) => {
    return sendCommand('battery', level);
  };

  // Fur command
  const sendFurCommand = (side: 'b' | 'l' | 'r', animation: string) => {
    const event = `fur_${side}_${animation}`;
    return sendCommand(event, {});
  };

  return {
    isConnected,
    hasJacket: !!clientSid,
    allClients,
    refreshClients,
    sendLEDStripAnimation,
    sendColorChange,
    sendBatteryLevel,
    sendFurCommand,
    sendCommand
  };
};