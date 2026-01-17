import { Op, Sequelize } from 'sequelize';
import Invoice from '../sales/invoice.model.js';
import InvoiceItem from '../sales/invoice-item.model.js';
import InventoryItem from '../inventory/item.model.js';
import User from '../auth/user.model.js';
import Branch from '../store/branch.model.js';
import Customer from '../customers/customer.model.js';
import WhatsappConfig from '../platform/whatsapp.config.model.js';
import { getLastPrice } from '../../utils/gold.service.js';

export const getOwnerDashboard = async (req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);

    const schema = req.tenant.db_schema;

    const invoicesToday = await Invoice.schema(schema).findAll({
      where: {
        createdAt: { [Op.gte]: todayStart },
        status: 'Paid'
      },
      include: [
        { model: InvoiceItem.schema(schema), as: 'items' }
      ]
    });

    let totalSalesToday = 0;
    let totalWeightToday = 0;
    let totalCostToday = 0;

    invoicesToday.forEach(inv => {
      totalSalesToday += parseFloat(inv.total_amount);
      totalWeightToday += parseFloat(inv.total_weight);
      
      inv.items.forEach(item => {
        const itemWeight = parseFloat(item.weight);
        const buyPrice = parseFloat(item.buy_price_snapshot || 0);
        totalCostToday += (itemWeight * buyPrice);
      });
    });

    const netProfitToday = totalSalesToday - totalCostToday;

    const whatsappConfig = await WhatsappConfig.findOne({ 
      where: { tenant_slug: req.tenant.slug } 
    });

    const salesLastWeek = await Invoice.schema(schema).findAll({
      where: {
        createdAt: { [Op.gte]: weekStart },
        status: 'Paid'
      },
      attributes: [
        [Sequelize.fn('date', Sequelize.col('created_at')), 'date'],
        [Sequelize.fn('sum', Sequelize.col('total_amount')), 'daily_sales']
      ],
      group: [Sequelize.fn('date', Sequelize.col('created_at'))],
      order: [[Sequelize.fn('date', Sequelize.col('created_at')), 'ASC']]
    });

    const branchSales = await Invoice.schema(schema).findAll({
      attributes: [
        'branch_id',
        [Sequelize.fn('sum', Sequelize.col('total_amount')), 'total_sales']
      ],
      include: [{ model: Branch.schema(schema), as: 'branch', attributes: ['name'] }],
      group: ['branch_id', 'branch.id', 'branch.name']
    });

    const aiInsights = [
      { type: 'prediction', text: 'Gold price expected to rise +1.5% tomorrow based on global trends.' },
      { type: 'anomaly', text: 'Salmiya branch sales are 20% lower than average this Tuesday.' }
    ];

    res.json({
      success: true,
      data: {
        live_prices: getLastPrice(),
        kpi: {
          total_sales: totalSalesToday.toFixed(3),
          net_profit: netProfitToday.toFixed(3),
          total_weight: totalWeightToday.toFixed(3),
          whatsapp_status: whatsappConfig?.session_status || 'DISCONNECTED'
        },
        charts: {
          weekly_sales: salesLastWeek,
          branch_pie: branchSales
        },
        ai_insights: aiInsights
      }
    });

  } catch (error) {
    console.error('Owner Dashboard Error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const getManagerDashboard = async (req, res) => {
  try {
    const branchId = req.user.branch_id;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const schema = req.tenant.db_schema;

    const branchInvoicesToday = await Invoice.schema(schema).findAll({
      where: {
        branch_id: branchId,
        createdAt: { [Op.gte]: todayStart },
        status: 'Paid'
      }
    });

    let branchSalesToday = 0;
    branchInvoicesToday.forEach(inv => {
      branchSalesToday += parseFloat(inv.total_amount);
    });

    const cashInHand = branchSalesToday; 

    const lowStockItems = await InventoryItem.schema(schema).findAll({
      where: {
        branch_id: branchId,
        status: 'In Stock',
        quantity: { [Op.lte]: Sequelize.col('min_stock_level') }
      },
      limit: 10
    });

    const hourlyTraffic = await Invoice.schema(schema).findAll({
      where: {
        branch_id: branchId,
        createdAt: { [Op.gte]: todayStart }
      },
      attributes: [
        [Sequelize.fn('EXTRACT', Sequelize.literal('HOUR FROM "created_at"')), 'hour'],
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
      ],
      group: [Sequelize.fn('EXTRACT', Sequelize.literal('HOUR FROM "created_at"'))],
      order: [[Sequelize.fn('EXTRACT', Sequelize.literal('HOUR FROM "created_at"')), 'ASC']]
    });

    const staffPerformance = await Invoice.schema(schema).findAll({
      where: {
        branch_id: branchId,
        createdAt: { [Op.gte]: todayStart }
      },
      attributes: [
        [Sequelize.fn('sum', Sequelize.col('total_amount')), 'total_sales'],
        'created_by'
      ],
      include: [{ model: User.schema(schema), as: 'creator', attributes: ['full_name'] }],
      group: ['created_by', 'creator.id', 'creator.full_name'],
      order: [[Sequelize.fn('sum', Sequelize.col('total_amount')), 'DESC']]
    });

    res.json({
      success: true,
      data: {
        live_prices: getLastPrice(),
        kpi: {
          branch_sales: branchSalesToday.toFixed(3),
          invoice_count: branchInvoicesToday.length,
          cash_in_hand: cashInHand.toFixed(3),
          low_stock_count: lowStockItems.length
        },
        alerts: {
          low_stock_items: lowStockItems.map(i => ({ name: i.item_name, qty: i.quantity, min: i.min_stock_level }))
        },
        charts: {
          hourly_traffic: hourlyTraffic,
          staff_leaderboard: staffPerformance
        }
      }
    });

  } catch (error) {
    console.error('Manager Dashboard Error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const getSalesmanDashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const schema = req.tenant.db_schema;

    const mySales = await Invoice.schema(schema).sum('total_amount', {
      where: {
        created_by: userId,
        createdAt: { [Op.gte]: todayStart },
        status: 'Paid'
      }
    });

    const lastInvoices = await Invoice.schema(schema).findAll({
      where: { created_by: userId },
      limit: 5,
      order: [['createdAt', 'DESC']],
      include: [{ model: Customer.schema(schema), as: 'customer', attributes: ['full_name'] }]
    });

    res.json({
      success: true,
      data: {
        live_prices: getLastPrice(),
        my_stats: {
          total_sales_today: (mySales || 0).toFixed(3)
        },
        recent_invoices: lastInvoices
      }
    });

  } catch (error) {
    console.error('Salesman Dashboard Error:', error);
    res.status(500).json({ message: error.message });
  }
};