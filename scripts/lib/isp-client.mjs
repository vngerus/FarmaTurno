/**
 * ISP Pharmacy Registry Scraper Client
 *
 * Scrapes registrosanitario.ispch.gob.cl (Chilean pharmaceutical registry)
 * Uses regex parsing against HTML fixtures (no external DOM parsing libraries)
 */

const ISP_BASE_URL = 'https://registrosanitario.ispch.gob.cl';
const ISP_BUSQUEDA_URL = `${ISP_BASE_URL}/Busqueda_Producto.aspx`;

/**
 * Extracts ASP.NET hidden form fields from HTML
 * @param {string} html - HTML content from ISP page
 * @returns {Object} Object with viewState, viewStateGenerator, eventValidation
 * @throws {Error} If any required field cannot be extracted
 */
export function extractHiddenFields(html) {
  // Extract __VIEWSTATE
  const viewStateMatch = html.match(/<input[^>]+name="__VIEWSTATE"[^>]+value="([^"]+)"/i);
  if (!viewStateMatch || !viewStateMatch[1]) {
    throw new Error('Could not extract __VIEWSTATE from HTML');
  }

  // Extract __VIEWSTATEGENERATOR
  const viewStateGeneratorMatch = html.match(/<input[^>]+name="__VIEWSTATEGENERATOR"[^>]+value="([^"]+)"/i);
  if (!viewStateGeneratorMatch || !viewStateGeneratorMatch[1]) {
    throw new Error('Could not extract __VIEWSTATEGENERATOR from HTML');
  }

  // Extract __EVENTVALIDATION
  const eventValidationMatch = html.match(/<input[^>]+name="__EVENTVALIDATION"[^>]+value="([^"]+)"/i);
  if (!eventValidationMatch || !eventValidationMatch[1]) {
    throw new Error('Could not extract __EVENTVALIDATION from HTML');
  }

  return {
    viewState: viewStateMatch[1],
    viewStateGenerator: viewStateGeneratorMatch[1],
    eventValidation: eventValidationMatch[1],
  };
}

/**
 * Parses product rows from ISP search results HTML
 * @param {string} html - HTML content with search results table
 * @returns {Array<Object>} Array of product objects with registroIsp, nombreProducto, fechaRegistro, empresa, principioActivo
 */
export function parseResultRows(html) {
  // Match the entire table
  const tableMatch = html.match(/<table[^>]*id="[^"]*gvDatosBusqueda"[^>]*>[\s\S]*?<\/table>/i);
  if (!tableMatch) {
    return [];
  }

  const tableHtml = tableMatch[0];

  // Match all table rows (skip header row)
  const rowMatches = tableHtml.matchAll(/<tr[^>]*>[\s\S]*?<\/tr>/gi);
  const rows = [];

  for (const rowMatch of rowMatches) {
    const rowHtml = rowMatch[0];

    // Skip header rows (they contain <th> tags)
    if (rowHtml.includes('<th')) {
      continue;
    }

    // Split by <td> to extract cell contents
    const cells = rowHtml.split(/<td[^>]*>/);
    if (cells.length < 6) continue;

    // Each cell contains a span with the data
    // Cell 1: registration number
    const registroMatch = cells[1].match(/<span[^>]*>([^<]+)<\/span>/);
    const registroIsp = registroMatch ? registroMatch[1].trim() : '';

    // Cell 2: product name
    const nombreMatch = cells[2].match(/<span[^>]*>([^<]+)<\/span>/);
    const nombreProducto = nombreMatch ? nombreMatch[1].trim() : '';

    // Cell 3: registration date
    const fechaMatch = cells[3].match(/<span[^>]*>([^<]+)<\/span>/);
    const fechaRegistro = fechaMatch ? fechaMatch[1].trim() : '';

    // Cell 4: company/titular
    const empresaMatch = cells[4].match(/<span[^>]*>([^<]+)<\/span>/);
    const empresa = empresaMatch ? empresaMatch[1].trim() : '';

    // Cell 5: active ingredient
    const paMatch = cells[5].match(/<span[^>]*>([^<]+)<\/span>/);
    const principioActivo = paMatch ? paMatch[1].trim() : '';

    // Only add if we have at least registro and nombre
    if (registroIsp && nombreProducto) {
      rows.push({
        registroIsp,
        nombreProducto,
        fechaRegistro,
        empresa,
        principioActivo,
      });
    }
  }

  return rows;
}

/**
 * Scrapes products by active ingredient from ISP pharmacy registry
 * Performs 3-step ASP.NET postback flow:
 * 1. GET initial page to extract ViewState
 * 2. POST to toggle checkbox (reveal input field)
 * 3. POST actual search with term
 *
 * @param {string} term - Search term (e.g., "PARACETAMOL")
 * @returns {Promise<Array>} Array of products matching the search term
 * @throws {Error} If HTTP requests fail or ViewState extraction fails
 */
export async function scrapeProductosPorPrincipioActivo(term) {
  let html, fields, postBody, response;

  // Step 1: GET initial page
  try {
    response = await fetch(ISP_BUSQUEDA_URL, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ISPScraper/1.0)',
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    html = await response.text();
  } catch (error) {
    throw new Error(`Failed to fetch initial page: ${error.message}`);
  }

  // Extract ViewState fields
  try {
    fields = extractHiddenFields(html);
  } catch (error) {
    throw new Error(`Failed to extract ViewState from initial page: ${error.message}`);
  }

  // Step 2: POST to toggle checkbox (reveal product name input)
  try {
    postBody = new URLSearchParams({
      __VIEWSTATE: fields.viewState,
      __VIEWSTATEGENERATOR: fields.viewStateGenerator,
      __EVENTVALIDATION: fields.eventValidation,
      __EVENTTARGET: 'ctl00$ContentPlaceHolder1$chkTipoBusqueda$0',
      __EVENTARGUMENT: '',
    });

    response = await fetch(ISP_BUSQUEDA_URL, {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ISPScraper/1.0)',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: postBody.toString(),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    html = await response.text();
  } catch (error) {
    throw new Error(`Failed to toggle checkbox: ${error.message}`);
  }

  // Extract new ViewState after toggle
  try {
    fields = extractHiddenFields(html);
  } catch (error) {
    throw new Error(`Failed to extract ViewState after checkbox toggle: ${error.message}`);
  }

  // Step 3: POST actual search
  try {
    postBody = new URLSearchParams({
      __VIEWSTATE: fields.viewState,
      __VIEWSTATEGENERATOR: fields.viewStateGenerator,
      __EVENTVALIDATION: fields.eventValidation,
      'ctl00$ContentPlaceHolder1$chkTipoBusqueda$0': 'on', // Checkbox must be checked
      'ctl00$ContentPlaceHolder1$txtNombreProducto': term,
      'ctl00$ContentPlaceHolder1$ddlEstado': 'Sí', // Vigente status
      'ctl00$ContentPlaceHolder1$btnBuscar': 'Buscar',
    });

    response = await fetch(ISP_BUSQUEDA_URL, {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ISPScraper/1.0)',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: postBody.toString(),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    html = await response.text();
  } catch (error) {
    throw new Error(`Failed to perform search: ${error.message}`);
  }

  // Parse results
  const results = parseResultRows(html);
  return results;
}
