interface Transaction {
  id?: string;
  amount: string;
  recipient: string;
  timestamp: string | Date;
  status: string;
  transactionHash?: string;
  fee?: string;
  type?: string;
}

/**
 * Export transactions as CSV
 */
export function exportToCSV(transactions: Transaction[], filename = 'afriflow-transactions.csv') {
  if (transactions.length === 0) {
    throw new Error('No transactions to export');
  }

  // CSV headers
  const headers = ['Date', 'Type', 'Amount (USDC)', 'Recipient', 'Status', 'Fee', 'Transaction Hash'];

  // Convert transactions to CSV rows
  const rows = transactions.map(tx => {
    const date = new Date(tx.timestamp).toLocaleString();
    const type = tx.type || 'Payment';
    const amount = tx.amount;
    const recipient = tx.recipient;
    const status = tx.status;
    const fee = tx.fee || '0';
    const hash = tx.transactionHash || 'N/A';

    return [date, type, amount, recipient, status, fee, hash];
  });

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export transactions as PDF (simplified version using window.print)
 */
export function exportToPDF(transactions: Transaction[]) {
  if (transactions.length === 0) {
    throw new Error('No transactions to export');
  }

  // Create a new window with printable content
  const printWindow = window.open('', '_blank');

  if (!printWindow) {
    throw new Error('Popup blocked. Please allow popups for this site.');
  }

  const totalAmount = transactions.reduce((sum, tx) => sum + parseFloat(tx.amount || '0'), 0);
  const totalFees = transactions.reduce((sum, tx) => sum + parseFloat(tx.fee || '0'), 0);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>AfriFlow Transaction History</title>
      <style>
        body {
          font-family: system-ui, -apple-system, sans-serif;
          margin: 40px;
          color: #1e293b;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #10b981;
          padding-bottom: 20px;
        }
        .header h1 {
          margin: 0;
          color: #10b981;
          font-size: 28px;
        }
        .header p {
          margin: 5px 0;
          color: #64748b;
        }
        .summary {
          background: #f1f5f9;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 30px;
        }
        .summary-item {
          display: flex;
          justify-content: space-between;
          margin: 10px 0;
          font-size: 14px;
        }
        .summary-item strong {
          color: #1e293b;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }
        thead {
          background: #e2e8f0;
        }
        th {
          padding: 12px;
          text-align: left;
          font-weight: 600;
          color: #475569;
          border-bottom: 2px solid #cbd5e1;
        }
        td {
          padding: 12px;
          border-bottom: 1px solid #e2e8f0;
          font-size: 13px;
        }
        .status-completed {
          color: #10b981;
          font-weight: 500;
        }
        .status-pending {
          color: #f59e0b;
          font-weight: 500;
        }
        .status-failed {
          color: #ef4444;
          font-weight: 500;
        }
        .footer {
          margin-top: 40px;
          text-align: center;
          font-size: 12px;
          color: #94a3b8;
          border-top: 1px solid #e2e8f0;
          padding-top: 20px;
        }
        @media print {
          body {
            margin: 20px;
          }
          .no-print {
            display: none;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>AfriFlow Transaction History</h1>
        <p>Generated on ${new Date().toLocaleString()}</p>
      </div>

      <div class="summary">
        <h3 style="margin-top: 0;">Summary</h3>
        <div class="summary-item">
          <span>Total Transactions:</span>
          <strong>${transactions.length}</strong>
        </div>
        <div class="summary-item">
          <span>Total Amount Sent:</span>
          <strong>$${totalAmount.toFixed(2)} USDC</strong>
        </div>
        <div class="summary-item">
          <span>Total Fees Paid:</span>
          <strong>$${totalFees.toFixed(2)} USDC</strong>
        </div>
        <div class="summary-item">
          <span>Average Transaction:</span>
          <strong>$${(totalAmount / transactions.length).toFixed(2)} USDC</strong>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Amount</th>
            <th>Recipient</th>
            <th>Status</th>
            <th>Fee</th>
            <th>Transaction Hash</th>
          </tr>
        </thead>
        <tbody>
          ${transactions.map(tx => {
            const statusClass = tx.status === 'completed' || tx.status === 'confirmed'
              ? 'status-completed'
              : tx.status === 'pending'
              ? 'status-pending'
              : 'status-failed';

            return `
              <tr>
                <td>${new Date(tx.timestamp).toLocaleString()}</td>
                <td>${tx.type || 'Payment'}</td>
                <td>$${tx.amount} USDC</td>
                <td>${tx.recipient.slice(0, 10)}...${tx.recipient.slice(-8)}</td>
                <td class="${statusClass}">${tx.status}</td>
                <td>$${tx.fee || '0'}</td>
                <td style="font-family: monospace; font-size: 11px;">
                  ${tx.transactionHash ? `${tx.transactionHash.slice(0, 10)}...` : 'N/A'}
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>

      <div class="footer">
        <p>AfriFlow - Cross-Border Payments Made Simple</p>
        <p>Powered by Cronos x402 Protocol</p>
      </div>

      <div class="no-print" style="margin-top: 20px; text-align: center;">
        <button onclick="window.print()" style="
          padding: 12px 24px;
          background: #10b981;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          cursor: pointer;
          font-weight: 500;
        ">
          Print / Save as PDF
        </button>
        <button onclick="window.close()" style="
          padding: 12px 24px;
          background: #64748b;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          cursor: pointer;
          margin-left: 10px;
          font-weight: 500;
        ">
          Close
        </button>
      </div>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
}

/**
 * Generate transaction analytics
 */
export interface TransactionAnalytics {
  totalSent: number;
  totalReceived: number;
  totalFees: number;
  transactionCount: number;
  averageAmount: number;
  largestTransaction: number;
  mostFrequentRecipient: string;
  monthlyBreakdown: Array<{
    month: string;
    amount: number;
    count: number;
  }>;
  statusBreakdown: {
    completed: number;
    pending: number;
    failed: number;
  };
}

export function analyzeTransactions(transactions: Transaction[]): TransactionAnalytics {
  if (transactions.length === 0) {
    return {
      totalSent: 0,
      totalReceived: 0,
      totalFees: 0,
      transactionCount: 0,
      averageAmount: 0,
      largestTransaction: 0,
      mostFrequentRecipient: '',
      monthlyBreakdown: [],
      statusBreakdown: { completed: 0, pending: 0, failed: 0 },
    };
  }

  const totalSent = transactions.reduce((sum, tx) => sum + parseFloat(tx.amount || '0'), 0);
  const totalFees = transactions.reduce((sum, tx) => sum + parseFloat(tx.fee || '0'), 0);
  const amounts = transactions.map(tx => parseFloat(tx.amount || '0'));
  const largestTransaction = Math.max(...amounts);

  // Find most frequent recipient
  const recipientCounts: Record<string, number> = {};
  transactions.forEach(tx => {
    recipientCounts[tx.recipient] = (recipientCounts[tx.recipient] || 0) + 1;
  });
  const mostFrequentRecipient = Object.entries(recipientCounts)
    .sort(([, a], [, b]) => b - a)[0]?.[0] || '';

  // Monthly breakdown
  const monthlyData: Record<string, { amount: number; count: number }> = {};
  transactions.forEach(tx => {
    const date = new Date(tx.timestamp);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { amount: 0, count: 0 };
    }
    monthlyData[monthKey].amount += parseFloat(tx.amount || '0');
    monthlyData[monthKey].count++;
  });

  const monthlyBreakdown = Object.entries(monthlyData).map(([month, data]) => ({
    month,
    amount: data.amount,
    count: data.count,
  }));

  // Status breakdown
  const statusBreakdown = transactions.reduce(
    (acc, tx) => {
      if (tx.status === 'completed' || tx.status === 'confirmed') {
        acc.completed++;
      } else if (tx.status === 'pending') {
        acc.pending++;
      } else {
        acc.failed++;
      }
      return acc;
    },
    { completed: 0, pending: 0, failed: 0 }
  );

  return {
    totalSent,
    totalReceived: 0, // Can be calculated if we track incoming transactions
    totalFees,
    transactionCount: transactions.length,
    averageAmount: totalSent / transactions.length,
    largestTransaction,
    mostFrequentRecipient,
    monthlyBreakdown,
    statusBreakdown,
  };
}
