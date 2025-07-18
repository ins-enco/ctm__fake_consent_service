// Mock data for MT4 broker information
const mockMt4Data = {
  mt4Daily: {
    Login: 123456,
    Time: new Date('2024-01-15T10:00:00Z'),
    Group: 'demo',
    Bank: 'Demo Bank',
    BalancePrev: 9850.75,
    Balance: 10000.00,
    Deposit: 10000.00,
    Credit: 0.00,
    ProfitClosed: 149.25,
    Profit: 0.00,
    Equity: 10000.00,
    Margin: 0.00,
    MarginFree: 10000.00,
    ModifyTime: new Date('2024-01-15T10:00:00Z')
  },
  mt4Users: {
    Login: 123456,
    Group: 'demo',
    Enabled: 1,
    AllowChangePassword: 1,
    CloseOnly: 0,
    OTPEnabled: 0,
    PhonePassword: 'encrypted_phone_pass',
    Owner: 'John Doe',
    Country: 'United States',
    City: 'New York',
    State: 'NY',
    ZipCode: '10001',
    Address: '123 Main Street',
    LeadSource: 'web',
    Phone: '+1-555-0123',
    Email: 'john.doe@example.com',
    Comment: 'Demo account for testing',
    PersonalIdentification: 'ID123456',
    Status: 'active',
    RegistrationDate: new Date('2024-01-01T00:00:00Z'),
    LastConnectionDate: new Date('2024-01-15T09:45:00Z'),
    Leverage: 100,
    AgentAccountLogin: 0,
    Timestamp: Math.floor(Date.now() / 1000),
    Balance: 10000.00,
    PreviousMonthBalance: 9500.00,
    PreviousDayBalance: 9850.75,
    Credit: 0.00,
    InterestRate: 0.00,
    Taxes: 0.00,
    SendReports: 1,
    MetaQuotesClientID: 0,
    UserColor: 16777215,
    Equity: 10000.00,
    Margin: 0.00,
    MarginLevel: 0.00,
    FreeMargin: 10000.00,
    Currency: 'USD',
    ModifyTime: new Date('2024-01-15T10:00:00Z')
  },
  mt4Trade: [
    {
      Ticket: 1001,
      Login: 123456,
      SymbolName: 'EURUSD',
      Digits: 5,
      tradeType: 0, // Buy
      VolumeMilliLots: 10000, // 0.1 lot
      OpenTime: new Date('2024-01-15T08:30:00Z'),
      OpenPrice: 1.08950,
      StopLoss: 1.08500,
      TakeProfit: 1.09500,
      CloseTime: new Date('2024-01-15T09:15:00Z'),
      ExpirationTime: new Date('2024-01-15T23:59:59Z'),
      Reason: 0,
      RateOpen: 1.0,
      RateClose: 1.0,
      Commission: -0.70,
      CommissionAgent: 0.00,
      Swaps: 0.00,
      ClosePrice: 1.09020,
      Profit: 70.00,
      Taxes: 0.00,
      Comment: 'Demo trade',
      internal_id: 1001,
      MarginRate: 1.0,
      timeStamp: Math.floor(Date.now() / 1000),
      Magic: 0,
      gw_volume: 0,
      gw_open_price: 0,
      gw_close_price: 0,
      ModifyTime: new Date('2024-01-15T09:15:00Z')
    },
    {
      Ticket: 1002,
      Login: 123456,
      SymbolName: 'GBPUSD',
      Digits: 5,
      tradeType: 1, // Sell
      VolumeMilliLots: 20000, // 0.2 lot
      OpenTime: new Date('2024-01-15T09:00:00Z'),
      OpenPrice: 1.27150,
      StopLoss: 1.27650,
      TakeProfit: 1.26650,
      CloseTime: new Date('2024-01-15T09:45:00Z'),
      ExpirationTime: new Date('2024-01-15T23:59:59Z'),
      Reason: 0,
      RateOpen: 1.0,
      RateClose: 1.0,
      Commission: -1.40,
      CommissionAgent: 0.00,
      Swaps: 0.00,
      ClosePrice: 1.26875,
      Profit: 55.00,
      Taxes: 0.00,
      Comment: 'Demo trade',
      internal_id: 1002,
      MarginRate: 1.0,
      timeStamp: Math.floor(Date.now() / 1000),
      Magic: 0,
      gw_volume: 0,
      gw_open_price: 0,
      gw_close_price: 0,
      ModifyTime: new Date('2024-01-15T09:45:00Z')
    }
  ]
};

export default defineEventHandler(async (event) => {
  try {
    // Return mock data instead of database queries
    return {
      mt4Daily: mockMt4Data.mt4Daily,
      mt4Users: mockMt4Data.mt4Users,
      mt4Trade: mockMt4Data.mt4Trade
    };
  } catch (error) {
    console.log(error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error'
    });
  }
});
