import makeWASocket, { 
    useMultiFileAuthState, 
    DisconnectReason, 
    fetchLatestBaileysVersion 
} from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';
import { pino } from 'pino';
import WhatsappConfig from '../domains/platform/whatsapp.config.model.js';

// نگهداری کانکشن‌های فعال در حافظه رم
const sessions = new Map();

export const getSessionStatus = async (tenantSlug) => {
    const config = await WhatsappConfig.findOne({ where: { tenant_slug: tenantSlug } });
    if (!config) return { status: 'NOT_CONFIGURED' };
    
    const session = sessions.get(tenantSlug);
    return {
        status: config.session_status,
        is_ready: !!session?.user,
        phone_connected: session?.user?.id.split(':')[0]
    };
};

export const connectToWhatsApp = async (tenantSlug, socketCallback) => {
    try {
        const sessionDir = path.join(process.cwd(), 'whatsapp_sessions', tenantSlug);
        
        if (!fs.existsSync(sessionDir)) {
            fs.mkdirSync(sessionDir, { recursive: true });
        }

        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
        const { version } = await fetchLatestBaileysVersion();

        const sock = makeWASocket.default({
            version,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: false,
            auth: state,
            browser: ["K-Qirat Gold System", "Chrome", "1.0.0"],
            syncFullHistory: false
        });

        sessions.set(tenantSlug, sock);

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                // تبدیل QR به DataURL برای ارسال به فرانت
                const qrCodeDataUrl = await QRCode.toDataURL(qr);
                if (socketCallback) socketCallback({ type: 'qr', data: qrCodeDataUrl });
            }

            if (connection === 'close') {
                const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
                
                await WhatsappConfig.update(
                    { session_status: 'DISCONNECTED' }, 
                    { where: { tenant_slug: tenantSlug } }
                );

                if (shouldReconnect) {
                    connectToWhatsApp(tenantSlug, socketCallback);
                } else {
                    if (fs.existsSync(sessionDir)) {
                        fs.rmSync(sessionDir, { recursive: true, force: true });
                    }
                    sessions.delete(tenantSlug);
                }
            } else if (connection === 'open') {
                await WhatsappConfig.update(
                    { 
                        session_status: 'CONNECTED',
                        last_active: new Date()
                    }, 
                    { where: { tenant_slug: tenantSlug } }
                );
                
                if (socketCallback) socketCallback({ type: 'connected', user: sock.user });
            }
        });

        return sock;

    } catch (error) {
        console.error('WhatsApp Connection Error:', error);
        throw error;
    }
};

export const sendInvoicePDF = async (tenantSlug, targetPhone, pdfPath, caption = '') => {
    try {
        let sock = sessions.get(tenantSlug);

        // اگر کانکشن قطع بود، تلاش برای اتصال مجدد
        if (!sock) {
            sock = await connectToWhatsApp(tenantSlug);
            // کمی صبر برای برقراری اتصال
            await new Promise(r => setTimeout(r, 3000));
        }

        const config = await WhatsappConfig.findOne({ where: { tenant_slug: tenantSlug } });
        if (!config || config.session_status !== 'CONNECTED') {
            console.log(`WhatsApp not connected for tenant: ${tenantSlug}`);
            return false;
        }

        // فرمت کردن شماره تلفن (حذف 0 یا + و اضافه کردن کد کشور اگر لازم باشد)
        // فرض بر این است که شماره‌ها استاندارد ذخیره شده‌اند، اما برای اطمینان:
        const formattedPhone = targetPhone.replace(/[^0-9]/g, '') + '@s.whatsapp.net';

        if (fs.existsSync(pdfPath)) {
            const pdfBuffer = fs.readFileSync(pdfPath);
            const fileName = path.basename(pdfPath);

            await sock.sendMessage(formattedPhone, {
                document: pdfBuffer,
                mimetype: 'application/pdf',
                fileName: fileName,
                caption: caption
            });
            return true;
        } else {
            console.error('PDF File not found:', pdfPath);
            return false;
        }

    } catch (error) {
        console.error('Send PDF Error:', error);
        return false;
    }
};

// تابع برای قطع اتصال دستی (Logout)
export const logoutWhatsApp = async (tenantSlug) => {
    try {
        const sock = sessions.get(tenantSlug);
        if (sock) {
            await sock.logout();
            sessions.delete(tenantSlug);
        }
        
        const sessionDir = path.join(process.cwd(), 'whatsapp_sessions', tenantSlug);
        if (fs.existsSync(sessionDir)) {
            fs.rmSync(sessionDir, { recursive: true, force: true });
        }

        await WhatsappConfig.update(
            { session_status: 'DISCONNECTED' }, 
            { where: { tenant_slug: tenantSlug } }
        );

        return true;
    } catch (error) {
        console.error('Logout Error:', error);
        return false;
    }
};