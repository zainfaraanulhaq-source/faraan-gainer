        const BINANCE_API_URL = 'https://api.binance.com/api/v3/ticker/24hr';
        const BINANCE_KLINES_API_URL = 'https://api.binance.com/api/v3/klines'; // New API endpoint for historical data
        const TOP_N_GAINERS = 5; // Number of top gainers to display
        const AUTO_REFRESH_INTERVAL_MINUTES = 5; // Auto-refresh every 5 minutes

        // ... (other constant and variable declarations) ...

        // Function to fetch top gainers from Binance API
        async function fetchTopGainers() {
            // ... (loading indicator and error handling setup) ...

            try {
                const response = await fetch(BINANCE_API_URL);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();

                // Filter for USDT pairs and sort by 24hr price change percentage
                const usdtPairs = data.filter(item => item.symbol.endsWith('USDT'));
                usdtPairs.sort((a, b) => parseFloat(b.priceChangePercent) - parseFloat(a.priceChangePercent));

                // Get top N gainers
                const topGainers = usdtPairs.slice(0, TOP_N_GAINERS).map(item => ({
                    symbol: item.symbol,
                    price: parseFloat(item.lastPrice),
                    gainPercent: parseFloat(item.priceChangePercent)
                }));

                return topGainers;

            } catch (error) {
                console.error('Error fetching data from Binance API:', error);
                showErrorMessage(`Failed to fetch data: ${error.message}. Please try again.`);
                return [];
            } finally {
                // ... (loading indicator and button state reset) ...
            }
        }

        // Function to fetch historical klines data (used for trend analysis)
        async function fetchKlinesData(symbol, interval, limit) {
            const url = `${BINANCE_KLINES_API_URL}?symbol=${symbol}&interval=${interval}&limit=${limit}`;
            try {
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                // klines data format: [open time, open, high, low, close, volume, close time, ...]
                // We need high (2), low (3), close (4)
                return data.map(kline => ({
                    openTime: kline[0],
                    open: parseFloat(kline[1]),
                    high: parseFloat(kline[2]),
                    low: parseFloat(kline[3]),
                    close: parseFloat(kline[4])
                }));
            } catch (error) {
                console.error(`Error fetching klines for ${symbol}:`, error);
                return [];
            }
        }

        // Function to get cryptocurrency analysis using Gemini API
        async function getGeminiAnalysis(symbol, price, gain) {
            // ... (modal and loading setup) ...

            try {
                // Fetch historical daily klines data for trend analysis (e.g., last 7 days)
                const klines = await fetchKlinesData(symbol, '1d', 7); // 1-day interval, last 7 candles

                let klinesDataForPrompt = 'Historical daily prices (Open, High, Low, Close):\n';
                if (klines.length > 0) {
                    klines.forEach(k => {
                        klinesDataForPrompt += `  ${formatDateTime(k.openTime)}: O:${k.open.toFixed(2)}, H:${k.high.toFixed(2)}, L:${k.low.toFixed(2)}, C:${k.close.toFixed(2)}\n`;
                    });
                } else {
                    klinesDataForPrompt += '  No recent historical data available for trend analysis.\n';
                }

                const prompt = `Provide a brief, neutral market overview and potential factors influencing the recent performance of ${symbol} cryptocurrency, considering its current price of $${price} and 24-hour gain of ${gain}%. Also, analyze the following historical daily price data for trend patterns (e.g., higher highs/higher lows for uptrend, or lower lows/lower highs for downtrend). Do not give financial advice.\n\n${klinesDataForPrompt}`;
                
                let chatHistory = [];
                chatHistory.push({ role: "user", parts: [{ text: prompt }] });

                const payload = { contents: chatHistory };
                const apiKey = ""; // API key will be provided by the environment
                const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                // Log the raw response for debugging
                const rawResponseText = await response.text();
                console.log('Raw API Response:', rawResponseText);

                const result = JSON.parse(rawResponseText); // Parse the response text as JSON

                if (result.candidates && result.candidates.length > 0 &&
                    result.candidates[0].content && result.candidates[0].content.parts &&
                    result.candidates[0].content.parts.length > 0) {
                    const text = result.candidates[0].content.parts[0].text;
                    analysisText.textContent = text;
                } else {
                    analysisText.textContent = 'Sorry, could not get an analysis at this time. The API response was unexpected or empty.';
                    console.error('Unexpected API response structure or empty content:', result);
                }
            } catch (error) {
                analysisText.textContent = 'An error occurred while fetching analysis. Please check your internet connection and try again.';
                console.error('Error fetching analysis:', error);
            } finally {
                // ... (loading spinner hidden) ...
            }
        }

        // ... (other functions like updateTracker, startAutoRefreshTimer, etc.) ...
