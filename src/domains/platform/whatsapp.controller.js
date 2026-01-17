import * as whatsappService from '../../utils/whatsapp.service.js';
import WhatsappConfig from '../platform/whatsapp.config.model.js';

export const getStatus = async (req, res) => {
  try {
    const status = await whatsappService.getSessionStatus(req.tenant.slug);
    res.json({ success: true, data: status });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const connect = async (req, res) => {
  const tenantSlug = req.tenant.slug;
  
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendEvent = (type, data) => {
    res.write(`data: ${JSON.stringify({ type, data })}\n\n`);
  };

  try {
    await whatsappService.connectToWhatsApp(tenantSlug, (event) => {
      if (event.type === 'qr') {
        sendEvent('qr', event.data);
      } else if (event.type === 'connected') {
        sendEvent('connected', { 
            phone: event.user.id.split(':')[0], 
            name: event.user.name 
        });
        res.end(); 
      }
    });

    req.on('close', () => {
      res.end();
    });

  } catch (error) {
    console.error('WhatsApp Connect Error:', error);
    sendEvent('error', error.message);
    res.end();
  }
};

export const disconnect = async (req, res) => {
  try {
    const success = await whatsappService.logoutWhatsApp(req.tenant.slug);
    if (success) {
      res.json({ success: true, message: 'Disconnected successfully.' });
    } else {
      res.status(400).json({ message: 'Failed to disconnect.' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateSettings = async (req, res) => {
  try {
    const { is_enabled, owner_phone, manager_phone } = req.body;
    
    let config = await WhatsappConfig.findOne({ where: { tenant_slug: req.tenant.slug } });
    
    if (!config) {
      config = await WhatsappConfig.create({
        tenant_slug: req.tenant.slug,
        is_enabled,
        owner_phone,
        manager_phone
      });
    } else {
      await config.update({ is_enabled, owner_phone, manager_phone });
    }

    res.json({ success: true, message: 'Settings updated.', data: config });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getSettings = async (req, res) => {
  try {
    const config = await WhatsappConfig.findOne({ where: { tenant_slug: req.tenant.slug } });
    res.json({ success: true, data: config || {} });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};