const axios = require('axios');

class DifyClient {
    constructor(apiKey, baseUrl = 'https://api.dify.ai/v1') {
        this.apiKey = apiKey;
        this.baseUrl = baseUrl;
        this.headers = {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        };
    }

    /**
     * 发送消息到 Dify API (非流式模式，返回完整结果)
     * @param {string} query - 用户输入的问题
     * @param {string} userId - 用户标识
     * @param {string} conversationId - 可选的会话ID
     * @returns {Promise<Object>} - 完整的回答对象
     */
    async sendMessage(query, userId = 'teams-user', conversationId = null) {
        const url = `${this.baseUrl}/chat-messages`;
        
        const payload = {
            inputs: {},
            query: query,
            response_mode: 'streaming',
            user: userId,
            auto_generate_name: true
        };

        if (conversationId) {
            payload.conversation_id = conversationId;
        }

        try {
            const response = await axios.post(url, payload, {
                headers: this.headers,
                responseType: 'stream',
                timeout: 120000
            });

            return new Promise((resolve, reject) => {
                let fullAnswer = '';
                let currentConversationId = conversationId;
                let messageId = null;
                let buffer = ''; // 缓冲区处理不完整数据

                response.data.on('data', (chunk) => {
                    // 将新数据添加到缓冲区
                    buffer += chunk.toString();
                    
                    // 处理完整的行
                    const lines = buffer.split('\n');
                    buffer = lines.pop(); // 保留最后一个不完整的行
                    
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const dataStr = line.substring(6).trim();
                            if (!dataStr) continue;
                            
                            try {
                                const data = JSON.parse(dataStr);
                                const event = data.event;

                                if (event === 'message' || event === 'agent_message') {
                                    const answerChunk = data.answer || '';
                                    fullAnswer += answerChunk;
                                    currentConversationId = data.conversation_id || currentConversationId;
                                    messageId = data.message_id || messageId;
                                } else if (event === 'message_end') {
                                    resolve({
                                        answer: fullAnswer,
                                        conversationId: currentConversationId,
                                        messageId: messageId,
                                        usage: data.metadata?.usage
                                    });
                                    return;
                                } else if (event === 'error') {
                                    reject(new Error(`Dify API Error: ${data.message}`));
                                    return;
                                }
                            } catch (parseError) {
                                // 忽略无法解析的行
                                continue;
                            }
                        }
                    }
                });

                response.data.on('end', () => {
                    if (fullAnswer) {
                        resolve({
                            answer: fullAnswer,
                            conversationId: currentConversationId,
                            messageId: messageId
                        });
                    } else {
                        reject(new Error('No response received from Dify API'));
                    }
                });

                response.data.on('error', (error) => {
                    reject(error);
                });
            });

        } catch (error) {
            console.error('Dify API request failed:', error.response?.data || error.message);
            
            // 提供更友好的错误信息
            if (error.response?.status === 400) {
                const errorData = error.response.data;
                if (errorData.code === 'model_currently_not_support') {
                    throw new Error('当前模型不可用，请检查 Dify 应用配置');
                } else if (errorData.code === 'provider_quota_exceeded') {
                    throw new Error('API 调用额度不足，请检查您的配额');
                } else if (errorData.code === 'app_unavailable') {
                    throw new Error('应用配置不可用，请检查 Dify 应用状态');
                }
            }
            
            throw new Error(`Dify API 调用失败: ${error.message}`);
        }
    }

    // /**
    //  * 获取流式响应（用于实时显示）
    //  * @param {string} query - 用户输入的问题
    //  * @param {string} userId - 用户标识
    //  * @param {string} conversationId - 可选的会话ID
    //  * @param {Function} onChunk - 收到数据块时的回调函数
    //  * @returns {Promise<Object>} - 最终结果
    //  */
    // async getStreamingResponse(query, userId = 'teams-user', conversationId = null, onChunk = null) {
    //     const url = `${this.baseUrl}/chat-messages`;
        
    //     const payload = {
    //         inputs: {},
    //         query: query,
    //         response_mode: 'streaming',
    //         user: userId,
    //         auto_generate_name: true
    //     };

    //     if (conversationId) {
    //         payload.conversation_id = conversationId;
    //     }

    //     try {
    //         const response = await axios.post(url, payload, {
    //             headers: this.headers,
    //             responseType: 'stream',
    //             timeout: 120000
    //         });

    //         return new Promise((resolve, reject) => {
    //             let fullAnswer = '';
    //             let currentConversationId = conversationId;
    //             let messageId = null;
    //             let buffer = ''; // 缓冲区处理不完整数据

    //             response.data.on('data', (chunk) => {
    //                 // 将新数据添加到缓冲区
    //                 buffer += chunk.toString();
                    
    //                 // 处理完整的行
    //                 const lines = buffer.split('\n');
    //                 buffer = lines.pop(); // 保留最后一个不完整的行
                    
    //                 for (const line of lines) {
    //                     if (line.startsWith('data: ')) {
    //                         const dataStr = line.substring(6).trim();
    //                         if (!dataStr) continue;
                            
    //                         try {
    //                             const data = JSON.parse(dataStr);
    //                             const event = data.event;

    //                             if (event === 'message' || event === 'agent_message') {
    //                                 const answerChunk = data.answer || '';
    //                                 fullAnswer += answerChunk;
    //                                 currentConversationId = data.conversation_id || currentConversationId;
    //                                 messageId = data.message_id || messageId;
                                    
    //                                 // 调用回调函数，传递当前累积的完整文本
    //                                 if (onChunk && answerChunk) {
    //                                     onChunk(fullAnswer, answerChunk);
    //                                 }
    //                             } else if (event === 'message_end') {
    //                                 resolve({
    //                                     answer: fullAnswer,
    //                                     conversationId: currentConversationId,
    //                                     messageId: messageId,
    //                                     usage: data.metadata?.usage
    //                                 });
    //                                 return;
    //                             } else if (event === 'error') {
    //                                 reject(new Error(`Dify API Error: ${data.message}`));
    //                                 return;
    //                             }
    //                         } catch (parseError) {
    //                             // 忽略无法解析的行
    //                             continue;
    //                         }
    //                     }
    //                 }
    //             });

    //             response.data.on('end', () => {
    //                 if (fullAnswer) {
    //                     resolve({
    //                         answer: fullAnswer,
    //                         conversationId: currentConversationId,
    //                         messageId: messageId
    //                     });
    //                 } else {
    //                     reject(new Error('No response received from Dify API'));
    //                 }
    //             });

    //             response.data.on('error', (error) => {
    //                 reject(error);
    //             });
    //         });

    //     } catch (error) {
    //         console.error('Dify API request failed:', error.response?.data || error.message);
    //         throw new Error(`Dify API 调用失败: ${error.message}`);
    //     }
    // }

    /**
     * 健康检查 - 发送简单消息测试连接
     * @returns {Promise<boolean>} - 连接是否成功
     */
    async healthCheck() {
        try {
            const result = await this.sendMessage('hi', 'health-check');
            return result.answer.length > 0;
        } catch (error) {
            console.error('Dify health check failed:', error.message);
            return false;
        }
    }
}

module.exports = DifyClient;
