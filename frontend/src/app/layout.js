import './globals.css';

export const metadata = {
  title: 'EcoNexus AI',
  description: 'AI-powered agricultural coordination platform',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <meta name="theme-color" content="#f5f7f0"/>
        <meta name="apple-mobile-web-app-capable" content="yes"/>
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/>
        <meta name="apple-mobile-web-app-title" content="EcoNexus"/>
        <link rel="manifest" href="/manifest.json"/>
      </head>
      <body>{children}</body>
    </html>
  );
}
