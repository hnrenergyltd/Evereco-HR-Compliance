import { query } from '../config/database.js';

export async function getEmergencyContacts(req, res) {
  const { id } = req.params;
  const employeeId = parseInt(id);

  // Check authorization - employee can only see their own, admins can see all
  if (req.user.role === 'employee' && req.user.employee_id !== employeeId) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  try {
    const result = await query(
      `SELECT rowid as id, employee_id, name, relationship, mobile_number,
              other_telephone, email, address, notes, created_at, updated_at
       FROM emergency_contacts WHERE employee_id = ? ORDER BY created_at ASC`,
      [employeeId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching emergency contacts:', error);
    res.status(500).json({ error: 'Failed to fetch emergency contacts' });
  }
}

export async function createEmergencyContact(req, res) {
  const { id } = req.params;
  const employeeId = parseInt(id);

  // Check authorization
  if (req.user.role === 'employee' && req.user.employee_id !== employeeId) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  const { name, relationship, mobile_number, other_telephone, email, address, notes } = req.body;

  // Validation
  if (!name || !relationship || !mobile_number) {
    return res.status(400).json({ error: 'Name, relationship, and mobile number are required' });
  }

  try {
    // Check if employee exists
    const empCheck = await query(
      `SELECT rowid as id FROM employees WHERE rowid = ? AND deleted_at IS NULL`,
      [employeeId]
    );

    if (empCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    await query(
      `INSERT INTO emergency_contacts (employee_id, name, relationship, mobile_number, other_telephone, email, address, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [employeeId, name, relationship, mobile_number, other_telephone || null, email || null, address || null, notes || null]
    );

    // Fetch and return the created contact (get the most recent one)
    const contactResult = await query(
      `SELECT rowid as id, employee_id, name, relationship, mobile_number, other_telephone, email, address, notes, created_at, updated_at
       FROM emergency_contacts WHERE employee_id = ? ORDER BY rowid DESC LIMIT 1`,
      [employeeId]
    );

    res.status(201).json(contactResult.rows[0]);
  } catch (error) {
    console.error('Error creating emergency contact:', error);
    res.status(500).json({ error: 'Failed to create emergency contact' });
  }
}

export async function updateEmergencyContact(req, res) {
  const { id, contactId } = req.params;
  const employeeId = parseInt(id);
  const contactRowId = parseInt(contactId);

  // Check authorization
  if (req.user.role === 'employee' && req.user.employee_id !== employeeId) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  const { name, relationship, mobile_number, other_telephone, email, address, notes } = req.body;

  // Validation
  if (!name || !relationship || !mobile_number) {
    return res.status(400).json({ error: 'Name, relationship, and mobile number are required' });
  }

  try {
    // Verify the contact belongs to this employee
    const contactCheck = await query(
      `SELECT rowid as id FROM emergency_contacts WHERE rowid = ? AND employee_id = ?`,
      [contactRowId, employeeId]
    );

    if (contactCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Emergency contact not found' });
    }

    await query(
      `UPDATE emergency_contacts SET
        name = ?, relationship = ?, mobile_number = ?, other_telephone = ?,
        email = ?, address = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
       WHERE rowid = ?`,
      [name, relationship, mobile_number, other_telephone || null, email || null, address || null, notes || null, contactRowId]
    );

    // Fetch and return updated contact
    const result = await query(
      `SELECT rowid as id, employee_id, name, relationship, mobile_number, other_telephone, email, address, notes, created_at, updated_at
       FROM emergency_contacts WHERE rowid = ?`,
      [contactRowId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating emergency contact:', error);
    res.status(500).json({ error: 'Failed to update emergency contact' });
  }
}

export async function deleteEmergencyContact(req, res) {
  const { id, contactId } = req.params;
  const employeeId = parseInt(id);
  const contactRowId = parseInt(contactId);

  // Check authorization
  if (req.user.role === 'employee' && req.user.employee_id !== employeeId) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  try {
    // Verify the contact belongs to this employee
    const contactCheck = await query(
      `SELECT rowid as id FROM emergency_contacts WHERE rowid = ? AND employee_id = ?`,
      [contactRowId, employeeId]
    );

    if (contactCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Emergency contact not found' });
    }

    await query(
      `DELETE FROM emergency_contacts WHERE rowid = ?`,
      [contactRowId]
    );

    res.json({ message: 'Emergency contact deleted successfully' });
  } catch (error) {
    console.error('Error deleting emergency contact:', error);
    res.status(500).json({ error: 'Failed to delete emergency contact' });
  }
}
