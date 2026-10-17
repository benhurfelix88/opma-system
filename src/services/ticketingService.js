const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const ticketingService = {
  // Get all ticket types
  getAllTicketTypes: async () => {
    try {
      const response = await fetch(`${API_URL}/ticket-types`);
      if (!response.ok) {
        throw new Error('Failed to fetch ticket types');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching ticket types:', error);
      throw error;
    }
  },

  // Create a new ticket type
  createTicketType: async (ticketData) => {
    try {
      const response = await fetch(`${API_URL}/ticket-types`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ticketData),
      });
      if (!response.ok) {
        throw new Error('Failed to create ticket type');
      }
      return await response.json();
    } catch (error) {
      console.error('Error creating ticket type:', error);
      throw error;
    }
  },

  // Update a ticket type
  updateTicketType: async (id, ticketData) => {
    try {
      const response = await fetch(`${API_URL}/ticket-types/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ticketData),
      });
      if (!response.ok) {
        throw new Error('Failed to update ticket type');
      }
      return await response.json();
    } catch (error) {
      console.error('Error updating ticket type:', error);
      throw error;
    }
  },

  // Delete a ticket type
  deleteTicketType: async (id) => {
    try {
      const response = await fetch(`${API_URL}/ticket-types/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete ticket type');
      }
      return await response.json();
    } catch (error) {
      console.error('Error deleting ticket type:', error);
      throw error;
    }
  },

  // Get ticket sales statistics
  getTicketSales: async () => {
    try {
      const response = await fetch(`${API_URL}/ticket-sales`);
      if (!response.ok) {
        throw new Error('Failed to fetch ticket sales');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching ticket sales:', error);
      throw error;
    }
  }
}; 