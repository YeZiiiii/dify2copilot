const { ActivityTypes } = require("@microsoft/agents-activity");
const { AgentApplication, MemoryStorage } = require("@microsoft/agents-hosting");

const config = require("./config");
const DifyClient = require("./difyClient");

// Initialize AI clients based on configuration
let aiClient;

  console.log('🤖 Using Dify AI Engine');
  aiClient = new DifyClient(config.difyApiKey, config.difyBaseUrl);
  
  // Test Dify connection on startup
  aiClient.healthCheck().then(isHealthy => {
    if (isHealthy) {
      console.log('✅ Dify API connection verified');
    } else {
      console.log('❌ Dify API connection failed');
    }
  }).catch(error => {
    console.log('❌ Dify API health check error:', error.message);
  });

// Define storage and application
const storage = new MemoryStorage();
const agentApp = new AgentApplication({
  storage,
});

// Store conversation IDs for each user
const userConversations = new Map();

agentApp.conversationUpdate("membersAdded", async (context) => {
  const welcomeMessage = `Hi there! I'm an AI agent powered by Dify. How can I help you today?`;
  await context.sendActivity(welcomeMessage);
});

// Listen for ANY message to be received. MUST BE AFTER ANY OTHER MESSAGE HANDLERS
agentApp.activity(ActivityTypes.Message, async (context) => {
  try {
    const userMessage = context.activity.text;
    const userId = context.activity.from.id;
    
    console.log(`📝 User ${userId}: ${userMessage}`);
    
    // 发送"正在思考"状态
    await context.sendActivity({ type: ActivityTypes.Typing });
    
    // Use Dify API
    console.log('🚀 Processing with Dify API...');
    
    // Get or create conversation ID for this user
    const conversationId = userConversations.get(userId);
    
    try {
      // 直接使用完整响应，避免复杂的流式处理
      const result = await aiClient.sendMessage(userMessage, userId, conversationId);
      
      // Store conversation ID for future messages
      if (result.conversationId) {
        userConversations.set(userId, result.conversationId);
        console.log(`💾 Stored conversation ID for user ${userId}: ${result.conversationId}`);
      }
      
      // Log usage statistics if available
      if (result.usage) {
        console.log(`📊 Usage - Tokens: ${result.usage.total_tokens}, Cost: ${result.usage.total_price} ${result.usage.currency}`);
      }
      
      // 直接发送完整响应
      await context.sendActivity(result.answer);
      console.log(`🤖 Response: ${result.answer}`);
      
    } catch (difyError) {
      console.error('❌ Dify API error:', difyError.message);
      await context.sendActivity("很抱歉，处理您的消息时遇到了错误，请稍后重试。");
    }
    
  } catch (error) {
    console.error('❌ Error processing message:', error);
    const errorMessage = "I apologize, but I encountered an error while processing your message. Please try again.";
    await context.sendActivity(errorMessage);
  }
});

module.exports = {
  agentApp,
};