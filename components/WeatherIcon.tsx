import React from 'react';

export const WeatherIcon: React.FC<{ code: number; className?: string }> = ({ code, className = "w-6 h-6" }) => {
    // WMO Weather interpretation codes (WW)
    // https://open-meteo.com/en/docs/forecast-api

    if (code === 0) { // Clear sky
        return (
            <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="5" fill="url(#sun-grad)" />
                <g stroke="#FFB000" strokeWidth="2" strokeLinecap="round">
                    <line x1="12" y1="3" x2="12" y2="5" />
                    <line x1="12" y1="19" x2="12" y2="21" />
                    <line x1="3" y1="12" x2="5" y2="12" />
                    <line x1="19" y1="12" x2="21" y2="12" />
                    <line x1="5.64" y1="5.64" x2="7.05" y2="7.05" />
                    <line x1="16.95" y1="16.95" x2="18.36" y2="18.36" />
                    <line x1="18.36" y1="5.64" x2="16.95" y2="7.05" />
                    <line x1="7.05" y1="16.95" x2="5.64" y2="18.36" />
                </g>
                <defs>
                    <radialGradient id="sun-grad" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(12 12) rotate(90) scale(5)">
                        <stop stopColor="#FFDE4D" />
                        <stop offset="1" stopColor="#FFB000" />
                    </radialGradient>
                </defs>
            </svg>
        );
    }

    if (code <= 3) { // Mainly clear, partly cloudy, and overcast
        return (
            <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="15" cy="9" r="3" fill="#FFDE4D" />
                <path d="M17.5 19C15.0147 19 13 16.9853 13 14.5C13 12.0147 15.0147 10 17.5 10C18.2393 10 18.9328 10.1782 19.5441 10.4938C19.7915 8.52091 21.4697 7 23.5 7C25.7091 7 27.5 8.79086 27.5 11C27.5 11.233 27.48 11.4614 27.4411 11.6835C28.3475 12.4419 29 13.5539 29 14.8C29 17.1196 27.1196 19 24.8 19H17.5Z" fill="#E2E8F0" transform="translate(-10, 0)" />
                <path d="M7 19C4.23858 19 2 16.7614 2 14C2 11.2386 4.23858 9 7 9C7.817 9 8.58332 9.19637 9.25821 9.54419C9.53123 7.56214 11.3323 6 13.5 6C15.9301 6 17.9155 7.93512 17.9949 10.3444C19.1245 10.6698 20 11.7335 20 13C20 14.6569 18.6569 16 17 16H7Z" fill="#E2E8F0" transform="translate(0, 2)" />
            </svg>
        );
    }

    if (code <= 65 || code === 80 || code === 81 || code === 82) { // Rain
        return (
            <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7 16C4.23858 16 2 13.7614 2 11C2 8.23858 4.23858 6 7 6C7.817 6 8.58332 6.19637 9.25821 6.54419C9.53123 4.56214 11.3323 3 13.5 3C15.9301 3 17.9155 4.93512 17.9949 7.34441C19.1245 7.66982 20 8.7335 20 10C20 11.6569 18.6569 13 17 13H7V16Z" fill="#94A3B8" />
                <g stroke="#38BDF8" strokeWidth="1.5" strokeLinecap="round">
                    <line x1="7" y1="16" x2="6" y2="19" />
                    <line x1="11" y1="17" x2="10" y2="20" />
                    <line x1="15" y1="16" x2="14" y2="19" />
                </g>
            </svg>
        );
    }

    if (code <= 77 || code === 85 || code === 86) { // Snow
        return (
            <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7 16C4.23858 16 2 13.7614 2 11C2 8.23858 4.23858 6 7 6C7.817 6 8.58332 6.19637 9.25821 6.54419C9.53123 4.56214 11.3323 3 13.5 3C15.9301 3 17.9155 4.93512 17.9949 7.34441C19.1245 7.66982 20 8.7335 20 10C20 11.6569 18.6569 13 17 13H7V16Z" fill="#E2E8F0" />
                <circle cx="7" cy="18" r="1.5" fill="#38BDF8" />
                <circle cx="11" cy="20" r="1.5" fill="#38BDF8" />
                <circle cx="15" cy="18" r="1.5" fill="#38BDF8" />
            </svg>
        );
    }

    if (code >= 95) { // Thunderstorm
        return (
            <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7 16C4.23858 16 2 13.7614 2 11C2 8.23858 4.23858 6 7 6C7.817 6 8.58332 6.19637 9.25821 6.54419C9.53123 4.56214 11.3323 3 13.5 3C15.9301 3 17.9155 4.93512 17.9949 7.34441C19.1245 7.66982 20 8.7335 20 10C20 11.6569 18.6569 13 17 13H7V16Z" fill="#475569" />
                <path d="M11 14L9 18H12L10 22" stroke="#FFD833" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        );
    }

    // Default: Cloudy
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M7 19C4.23858 19 2 16.7614 2 14C2 11.2386 4.23858 9 7 9C7.817 9 8.58332 9.19637 9.25821 9.54419C9.53123 7.56214 11.3323 6 13.5 6C15.9301 6 17.9155 7.93512 17.9949 10.3444C19.1245 10.6698 20 11.7335 20 13C20 14.6569 18.6569 16 17 16H7V19H7Z" fill="#CBD5E1" />
        </svg>
    );
};
