const { ActivityTypes } = require("@microsoft/agents-activity");
const { AgentApplication, MemoryStorage } = require("@microsoft/agents-hosting");

const config = require("./config");
const DifyClient = require("./difyClient");

// Initialize AI clients based on configuration
let aiClient;
let systemPrompt = "You are an AI agent that can chat with users.";

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
    
    let answer = "";
    
      // Use Dify API
      console.log('🚀 Processing with Dify API...');
      
      // Get or create conversation ID for this user
      const conversationId = userConversations.get(userId);
      
      try {
        const result = await aiClient.sendMessage(userMessage, userId, conversationId);
        answer = result.answer;
        
        // Store conversation ID for future messages
        if (result.conversationId) {
          userConversations.set(userId, result.conversationId);
          console.log(`💾 Stored conversation ID for user ${userId}: ${result.conversationId}`);
        }
        
        // Log usage statistics if available
        if (result.usage) {
          console.log(`📊 Usage - Tokens: ${result.usage.total_tokens}, Cost: ${result.usage.total_price} ${result.usage.currency}`);
        }
        
      } catch (difyError) {
        console.error('❌ Dify API error:', difyError.message);
      }
    
    console.log(`🤖 Response: ${answer}`);
    await context.sendActivity(answer);
    
  } catch (error) {
    console.error('❌ Error processing message:', error);
    const errorMessage = "I apologize, but I encountered an error while processing your message. Please try again.";
    await context.sendActivity(errorMessage);
  }
});

module.exports = {
  agentApp,
};