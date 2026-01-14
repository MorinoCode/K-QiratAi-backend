import { faker } from '@faker-js/faker';
import bcrypt from 'bcrypt';
import sequelize from '../config/database.js';
import User from '../domains/auth/user.model.js';
import Store from '../domains/auth/store.model.js';
import Customer from '../domains/customers/customer.model.js';
import GoldItem from '../domains/gold/gold.model.js';
import GoldPurchase from '../domains/gold/gold_purchase.model.js';
import Invoice from '../domains/invoices/invoice.model.js';
import InvoiceItem from '../domains/invoices/invoice_items.model.js';
import dotenv from 'dotenv';

dotenv.config();

const KARATS = ['18', '21', '22', '24'];
const CATEGORIES = ['Ring', 'Necklace', 'Bracelet', 'Earring', 'Set', 'General'];

const seedDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('🌱 Connected to DB. Cleaning data...');
    
    await sequelize.sync({ force: true });

    const passwordHash = await bcrypt.hash('123456', 10);

    const storesData = [
      { name: 'K-Qirat Main Branch (HQ)', location: 'Salmiya, Block 4', phone: '96550001111', is_main: true },
      { name: 'K-Qirat The Avenues', location: 'The Avenues Mall', phone: '96550002222', is_main: false },
      { name: 'K-Qirat Al-Kout', location: 'Fahaheel, Al-Kout', phone: '96550003333', is_main: false }
    ];

    const stores = [];
    const admins = [];

    for (let i = 0; i < storesData.length; i++) {
      const store = await Store.create(storesData[i]);
      stores.push(store);

      const username = i === 0 ? 'admin' : `manager${i+1}`;
      const role = i === 0 ? 'admin' : 'manager';
      
      const user = await User.create({
        username: username,
        password: passwordHash,
        full_name: i === 0 ? 'Super Admin' : `Manager Store ${i+1}`,
        role: role,
        store_id: store.id
      });
      admins.push(user);

      store.manager_id = user.id;
      await store.save();

      console.log(`✅ Created Store: ${store.name} | Admin: ${username}`);
    }

    // ادامه کد مثل قبل (بدون تغییر) برای پر کردن داده‌ها...
    // برای خلاصه شدن اینجا تکرار نکردم، اما بقیه لاجیک پر کردن Staff و Customer را مثل فایل قبلی نگه دارید.
    // اگر فایل کامل قبلی را دارید، فقط بخش storesData (خط ۲۶ تا ۳۲) را با کد بالا جایگزین کنید.
    // اما چون خواستی کامل بفرستم، این ادامه کد است:

    for (const store of stores) {
      const storeId = store.id;
      const adminId = store.manager_id;

      for (let j = 0; j < 10; j++) {
        await User.create({
          username: `staff_${storeId}_${j+1}`,
          password: passwordHash,
          full_name: faker.person.fullName(),
          role: 'staff',
          store_id: storeId
        });
      }

      const storeCustomers = [];
      for (let k = 0; k < 20; k++) {
        const cust = await Customer.create({
          full_name: faker.person.fullName(),
          phone: faker.phone.number('965########'),
          civil_id: faker.string.numeric(12),
          nationality: Math.random() > 0.8 ? 'Expat' : 'Kuwaiti',
          type: Math.random() > 0.9 ? 'VIP' : 'Regular',
          store_id: storeId,
          notes: faker.lorem.sentence()
        });
        storeCustomers.push(cust);
      }

      for (const cat of CATEGORIES) {
        for (let m = 0; m < 10; m++) {
          const karat = faker.helpers.arrayElement(KARATS);
          const weight = faker.number.float({ min: 2, max: 50, precision: 0.01 });
          
          let basePrice = 20; 
          if(karat === '21') basePrice = 17;
          if(karat === '18') basePrice = 14.5;

          await GoldItem.create({
            item_name: `${cat} ${faker.commerce.productAdjective()}`,
            category: cat,
            karat: karat,
            weight: weight,
            buy_price_per_gram: (basePrice - 1).toFixed(3), 
            barcode: `${storeId}-${cat.substring(0,2).toUpperCase()}-${faker.string.numeric(6)}`,
            store_id: storeId,
            user_id: adminId,
            added_by: adminId,
            status: 'In Stock'
          });
        }
      }

      for (let n = 0; n < 15; n++) {
        const randomCustomer = faker.helpers.arrayElement(storeCustomers);
        const date = faker.date.recent({ days: 30 });

        const soldItems = [];
        const itemCount = faker.number.int({ min: 1, max: 3 });
        let totalAmount = 0;
        let totalWeight = 0;

        for(let x=0; x<itemCount; x++) {
            const w = faker.number.float({ min: 3, max: 15, precision: 0.01 });
            const k = '21';
            const p = 17.500;
            const labor = 3.000;
            const sub = w * (p + labor);
            
            const soldItem = await GoldItem.create({
                item_name: `Sold Item ${x}`,
                category: 'Ring',
                karat: k,
                weight: w,
                buy_price_per_gram: 16.000,
                barcode: `SOLD-${faker.string.numeric(8)}`,
                store_id: storeId,
                user_id: adminId,
                added_by: adminId,
                status: 'Sold',
                createdAt: date,
                updatedAt: date
            });
            
            soldItems.push({
                gold_item_id: soldItem.id,
                weight: w,
                karat: k,
                sell_price_per_gram: p,
                labor_cost_per_gram: labor,
                total_price: sub
            });

            totalAmount += sub;
            totalWeight += w;
        }

        const invoice = await Invoice.create({
            invoice_number: `INV-${storeId}-${Date.now()}-${n}`,
            customer_name: randomCustomer.full_name,
            customer_phone: randomCustomer.phone,
            customer_civil_id: randomCustomer.civil_id,
            total_weight: totalWeight,
            total_amount: totalAmount,
            payment_method: faker.helpers.arrayElement(['Cash', 'K-Net', 'Link']),
            user_id: adminId,
            created_by: adminId,
            createdAt: date,
            updatedAt: date
        });

        for(const item of soldItems) {
            await InvoiceItem.create({
                invoice_id: invoice.id,
                gold_item_id: item.gold_item_id,
                weight: item.weight,
                karat: item.karat,
                price_per_gram: item.sell_price_per_gram,
                labor_cost: item.labor_cost_per_gram,
                subtotal: item.total_price
            });
        }
      }
    }

    console.log('🎉 SEEDING COMPLETE!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seedDatabase();