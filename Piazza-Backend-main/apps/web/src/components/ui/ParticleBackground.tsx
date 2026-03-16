import React, { useEffect, useRef } from 'react';

export const ParticleBackground: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let mouseX = -1000;
        let mouseY = -1000;
        let targetMouseX = -1000;
        let targetMouseY = -1000;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        const handleMouseMove = (e: MouseEvent) => {
            targetMouseX = e.clientX;
            targetMouseY = e.clientY;
        };

        const handleMouseLeave = () => {
            // Let the cursor spotlight naturally fade out by moving it off screen slowly or just jump off
            targetMouseX = -1000;
            targetMouseY = -1000;
        };

        window.addEventListener('resize', resize);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseleave', handleMouseLeave);

        resize();

        let time = 0;

        const draw = () => {
            time += 0.003; // Slower time step for smooth ambient movement

            // Smoothly interpolate mouse position for a fluid trailing effect
            mouseX += (targetMouseX - mouseX) * 0.15;
            mouseY += (targetMouseY - mouseY) * 0.15;

            // Deep dark void background
            ctx.fillStyle = '#05050a'; // Very dark indigo/black
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Animated dot-matrix grid (ABPFC base)
            const spacing = 45;
            const dotRadius = 1.2;
            
            ctx.fillStyle = 'rgba(255, 255, 255, 0.08)'; // Slightly brighter dots
            
            for (let x = 0; x < canvas.width; x += spacing) {
                for (let y = 0; y < canvas.height; y += spacing) {
                    // Fluid wave animation for the grid
                    const offsetX = Math.sin(time * 2 + y * 0.01) * 3;
                    const offsetY = Math.cos(time * 2 + x * 0.01) * 3;
                    
                    ctx.beginPath();
                    ctx.arc(x + offsetX, y + offsetY, dotRadius, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            // Global composite operation to make colors vividly blend (Additive blending)
            ctx.globalCompositeOperation = 'screen';

            // Draw ambient, massive, brightly glowing neon orbs
            const drawOrb = (x: number, y: number, radius: number, colorCenter: string, colorEdge: string) => {
                const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
                gradient.addColorStop(0, colorCenter);
                gradient.addColorStop(1, colorEdge);
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.fill();
            };

            // Orb 1: Vibrant Neon Purple
            const orb1X = canvas.width * 0.2 + Math.sin(time) * 300;
            const orb1Y = canvas.height * 0.3 + Math.cos(time * 0.8) * 250;
            drawOrb(orb1X, orb1Y, 800, 'rgba(147, 51, 234, 0.25)', 'rgba(147, 51, 234, 0)');

            // Orb 2: Electric Cyan/Blue
            const orb2X = canvas.width * 0.8 + Math.cos(time * 0.9) * 400;
            const orb2Y = canvas.height * 0.7 + Math.sin(time * 1.1) * 300;
            drawOrb(orb2X, orb2Y, 900, 'rgba(6, 182, 212, 0.2)', 'rgba(6, 182, 212, 0)');

            // Orb 3: Hot Pink (adding depth and brightness)
            const orb3X = canvas.width * 0.5 + Math.sin(time * 1.5) * 500;
            const orb3Y = canvas.height * 0.9 + Math.cos(time * 0.5) * 200;
            drawOrb(orb3X, orb3Y, 700, 'rgba(236, 72, 153, 0.15)', 'rgba(236, 72, 153, 0)');

            // Interactive Cursor Highlight (The intense bright ABPFC spotlight)
            if (mouseX > -500) {
                // Wide, soft glow tracking the cursor
                const highlightRadius = 600;
                const highlight = ctx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, highlightRadius);
                highlight.addColorStop(0, 'rgba(255, 255, 255, 0.12)'); // Brighter center
                highlight.addColorStop(0.3, 'rgba(147, 51, 234, 0.08)'); // Purple mid-ring
                highlight.addColorStop(0.7, 'rgba(6, 182, 212, 0.04)'); // Cyan outer-ring
                highlight.addColorStop(1, 'rgba(0, 0, 0, 0)');

                ctx.fillStyle = highlight;
                ctx.beginPath();
                ctx.arc(mouseX, mouseY, highlightRadius, 0, Math.PI * 2);
                ctx.fill();
                
                // Intense bright core directly on the cursor
                const centerRadius = 200;
                const centerSpot = ctx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, centerRadius);
                centerSpot.addColorStop(0, 'rgba(255, 255, 255, 0.25)'); // Almost pure white core
                centerSpot.addColorStop(0.5, 'rgba(255, 255, 255, 0.05)');
                centerSpot.addColorStop(1, 'rgba(0, 0, 0, 0)');
                
                ctx.fillStyle = centerSpot;
                ctx.beginPath();
                ctx.arc(mouseX, mouseY, centerRadius, 0, Math.PI * 2);
                ctx.fill();
            }

            // Reset composite operation to normal
            ctx.globalCompositeOperation = 'source-over';

            animationFrameId = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            window.removeEventListener('resize', resize);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseleave', handleMouseLeave);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none z-0"
            style={{ backgroundColor: '#05050a' }}
        />
    );
};
