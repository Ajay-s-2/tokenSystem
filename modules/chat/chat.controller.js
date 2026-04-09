const chatService = require("./chat.service");
const { sendSuccess, sendError } = require("../../shared/utils/response.util");

const createMessage = async (req, res) => {
  try {
    const message = await chatService.createMessage({
      doctorId: req.body.doctorId,
      hospitalId: req.body.hospitalId,
      message: req.body.message,
      type: req.body.type,
      conversationId: req.body.conversationId,
      requesterId: req.user?.id,
      requesterRole: req.user?.role,
    });

    return sendSuccess(res, "Message sent successfully", message, 201);
  } catch (error) {
    return sendError(
      res,
      error.message || "Internal server error",
      error.statusCode || 500,
      error.errors || null
    );
  }
};

const listMessages = async (req, res) => {
  try {
    const data = await chatService.listMessages({
      doctorId: req.query.doctorId,
      hospitalId: req.query.hospitalId,
      requesterId: req.user?.id,
      requesterRole: req.user?.role,
      query: req.query,
    });

    return sendSuccess(res, "Messages fetched successfully", data);
  } catch (error) {
    return sendError(
      res,
      error.message || "Internal server error",
      error.statusCode || 500,
      error.errors || null
    );
  }
};

const updateMessage = async (req, res) => {
  try {
    const message = await chatService.updateMessage({
      id: req.params.id,
      message: req.body.message,
      requesterId: req.user?.id,
      requesterRole: req.user?.role,
    });

    return sendSuccess(res, "Message updated successfully", message);
  } catch (error) {
    return sendError(
      res,
      error.message || "Internal server error",
      error.statusCode || 500,
      error.errors || null
    );
  }
};

const deleteMessage = async (req, res) => {
  try {
    const data = await chatService.deleteMessage({
      id: req.params.id,
      requesterId: req.user?.id,
      requesterRole: req.user?.role,
    });

    return sendSuccess(res, "Message deleted successfully", data);
  } catch (error) {
    return sendError(
      res,
      error.message || "Internal server error",
      error.statusCode || 500,
      error.errors || null
    );
  }
};

const markConversationAsRead = async (req, res) => {
  try {
    const data = await chatService.markConversationAsRead({
      doctorId: req.body.doctorId,
      hospitalId: req.body.hospitalId,
      conversationId: req.body.conversationId,
      requesterId: req.user?.id,
      requesterRole: req.user?.role,
    });

    return sendSuccess(res, "Conversation marked as read", data);
  } catch (error) {
    return sendError(
      res,
      error.message || "Internal server error",
      error.statusCode || 500,
      error.errors || null
    );
  }
};

const clearConversation = async (req, res) => {
  try {
    const data = await chatService.clearConversation({
      doctorId: req.body.doctorId,
      hospitalId: req.body.hospitalId,
      conversationId: req.body.conversationId,
      requesterId: req.user?.id,
      requesterRole: req.user?.role,
    });

    return sendSuccess(res, "Conversation cleared successfully", data);
  } catch (error) {
    return sendError(
      res,
      error.message || "Internal server error",
      error.statusCode || 500,
      error.errors || null
    );
  }
};

module.exports = {
  createMessage,
  listMessages,
  updateMessage,
  deleteMessage,
  markConversationAsRead,
  clearConversation,
};
