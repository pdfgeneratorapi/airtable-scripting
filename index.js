/**
 * PDF Generator API configuration
 */
const apiKey = ''; // Your PDF Generator API Key
const apiSecret = ''; // Your PDF Generator API Secret
const apiWorkspace = ''; // Your PDF Generator API Email
const templateId = ''; // Your PDF Generator API Template ID
const url = `https://us1.pdfgeneratorapi.com/api/v3/templates/${templateId}/output?output=url`;

/**
 * Airtable table and record config.
 */
const ordersTable = base.getTable('Orders');
const lineItemsTable = base.getTable('LineItems');
const customersTable = base.getTable('Customers');
const saveDocToField = 'Attachments';
const orderId = 'recsi3Bn1x9MU3gGK';

/**
 * Find record from Orders table and also fetch LineItems from linked table
 */
let records = await loadRecords(ordersTable, [orderId]);

/**
 * Find linked records for LineItems and Customer
 */
for (let i = 0; i < records.length; i++) {
    const lineItems = await loadRecords(lineItemsTable, records[i].LineItems.map((item) => { return item.id; }));
    const customers = await loadRecords(customersTable, [records[i].Customer[0].id]);
    records[i].LineItems = lineItems;
    records[i].Customer = customers[0]; // loadRecords returns array of items, we only want the first
}

if (records.length) {
    /**
     * Make PDF Generator API request with API credentials and record data as request body
     */
    const response = await remoteFetchAsync(url, {
        method: 'POST', 
        redirect: 'follow',
        headers: {
             'Content-Type': 'application/json',
             'X-Auth-Key': apiKey,
             'X-Auth-Secret': apiSecret,
             'X-Auth-Workspace': apiWorkspace
        },
        body: JSON.stringify(records),
    });

    const result = JSON.parse(await response.text());
    if (result.error) {
        throw result.error;
    }
  
    /**
     * Save generated PDF document to attachment field
     */
    await ordersTable.updateRecordAsync(orderId, {
        [saveDocToField]: [{url: result.response, filename: result.meta.display_name}]
    });
}

/**
 * Load records from table by list of ids
 * 
 * @param {Table} table
 * @param {Array} recordIds
 */
async function loadRecords(table, recordIds)
{
  const queryResult = await table.selectRecordsAsync();
  return Promise.all(recordIds.map((recordId) => {
    return convertToObject(table, queryResult.getRecord(recordId));
  }));
}

/**
 * Converts Record class into plain JavaScript object
 * 
 * @param {Table} table
 * @param {Record} record
 */
async function convertToObject(table, record) {
  let r = {
    id: record.id
  };

  for (let i = 0; i < table.fields.length; i++) {
    const field = table.fields[i];
    let value = record.getCellValue(field.name);
    r[field.name] = value;
  }

  return r;
}
