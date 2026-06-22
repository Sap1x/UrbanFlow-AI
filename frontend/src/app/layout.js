import './globals.css';
import Sidebar from '@/components/Sidebar';

export const metadata = {
  title: 'UrbanFlow Command Center — Smart Mobility Intelligence Platform',
  description: 'City-scale traffic intelligence platform. Predict. Simulate. Optimize. Deploy. AI-powered congestion prediction, digital twin simulation, and operational decision support.',
  keywords: 'traffic management, AI, smart city, congestion prediction, digital twin',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#060A13" />
      </head>
      <body>
        <div className="app-layout">
          <Sidebar />
          <main className="main-content">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
