import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
// Priority: Service Role Key (for backend), then Anon Key, then generic Key
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Missing Supabase environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY). Database operations may fail.');
}

// Initialize the Supabase client
const supabase = createClient(supabaseUrl || '', supabaseKey || '');

/**
 * Reusable abstract CRUD database helper functions.
 * Encapsulates all Supabase client logic so controllers do not interact with it directly.
 */
const dbHelper = {
  /**
   * Create/Insert data into a table
   * @param {string} tableName - The name of the table
   * @param {object|array} data - The data to insert
   * @returns {Promise<any>} - Returns the inserted record(s)
   */
  async create(tableName, data) {
    const { data: result, error } = await supabase
      .from(tableName)
      .insert(data)
      .select();
      
    if (error) throw error;
    return result;
  },

  /**
   * Read/Select data from a table
   * @param {string} tableName - The name of the table
   * @param {object} query - key-value pairs for equality matching (e.g., { id: 1 })
   * @param {string} columns - Columns to retrieve, defaults to '*'
   * @returns {Promise<any[]>} - Returns array of matched records
   */
  async read(tableName, query = {}, columns = '*') {
    let request = supabase.from(tableName).select(columns);
    
    // Apply equality filters based on the query object
    for (const [key, value] of Object.entries(query)) {
      request = request.eq(key, value);
    }
    
    const { data, error } = await request;
    if (error) throw error;
    return data;
  },

  /**
   * Update data in a table
   * @param {string} tableName - The name of the table
   * @param {object} matchCriteria - key-value pairs to match rows to update (e.g., { id: 1 })
   * @param {object} data - The new data payload
   * @returns {Promise<any>} - Returns the updated record(s)
   */
  async update(tableName, matchCriteria, data) {
    let request = supabase.from(tableName).update(data);
    
    // Apply filters to target specific rows
    for (const [key, value] of Object.entries(matchCriteria)) {
      request = request.eq(key, value);
    }
    
    const { data: result, error } = await request.select();
    if (error) throw error;
    return result;
  },

  /**
   * Delete data from a table
   * @param {string} tableName - The name of the table
   * @param {object} matchCriteria - key-value pairs to match rows to delete (e.g., { id: 1 })
   * @returns {Promise<any>} - Returns the deleted record(s)
   */
  async delete(tableName, matchCriteria) {
    let request = supabase.from(tableName).delete();
    
    // Apply filters to target specific rows
    for (const [key, value] of Object.entries(matchCriteria)) {
      request = request.eq(key, value);
    }
    
    const { data: result, error } = await request.select();
    if (error) throw error;
    return result;
  }
};

export default dbHelper;
