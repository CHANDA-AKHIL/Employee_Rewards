import React from 'react';

export const VideoBackground: React.FC = () => {
    return (
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
            {/* Dark base layer */}
            <div className="absolute inset-0 bg-[#05050a]" />

            {/* Simulated Motion Video Layer using high-performance CSS animations */}
            <div className="absolute inset-0 opacity-40">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[#7c3aed] filter blur-[120px] animate-blob" />
                <div className="absolute top-[20%] right-[-5%] w-[35%] h-[35%] rounded-full bg-[#06b6d4] filter blur-[100px] animate-blob animation-delay-2000" />
                <div className="absolute bottom-[-10%] left-[20%] w-[45%] h-[45%] rounded-full bg-[#f43f5e] filter blur-[150px] animate-blob animation-delay-4000" />
                <div className="absolute bottom-[10%] right-[10%] w-[30%] h-[30%] rounded-full bg-[#7c3aed] filter blur-[80px] animate-blob animation-delay-6000" />
            </div>

            {/* Glass Overlays for depth */}
            <div className="absolute inset-0 bg-gradient-to-tr from-[#05050a] via-transparent to-transparent opacity-80" />
            <div className="absolute inset-0 backdrop-blur-[1px]" />

            {/* Noise/Grain for texture */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
        </div>
    );
};

// Add these to index.css if not present:
// .animate-blob { animation: blob 20s infinite; }
// @keyframes blob {
//   0% { transform: translate(0px, 0px) scale(1); }
//   33% { transform: translate(30px, -50px) scale(1.1); }
//   66% { transform: translate(-20px, 20px) scale(0.9); }
//   100% { transform: translate(0px, 0px) scale(1); }
// }
