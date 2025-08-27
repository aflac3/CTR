#!/usr/bin/env python3
"""
Quick Start Script for SAUC Three-Agent System
Simplified launcher for the Mission Control Center
"""

import asyncio
import sys
import os
from pathlib import Path

def check_requirements():
    """Check if system requirements are met"""
    print("🔍 Checking system requirements...")
    
    # Check Python version
    if sys.version_info < (3, 8):
        print("❌ Python 3.8+ required. Current version:", sys.version)
        return False
    
    # Check if we're in the right directory
    if not Path("mission_control_center_v2.py").exists():
        print("❌ Not in SAUC-MASTER-FINAL directory")
        print("Please navigate to the SAUC-MASTER-FINAL directory first")
        return False
    
    # Check for required files
    required_files = [
        "ananke/elizaos_directs_ananke.py",
        "ananke/core/maximum_ananke.py", 
        "chronos/service.py",
        "config/mission_control.yaml"
    ]
    
    missing_files = []
    for file_path in required_files:
        if not Path(file_path).exists():
            missing_files.append(file_path)
    
    if missing_files:
        print("❌ Missing required files:")
        for file_path in missing_files:
            print(f"   - {file_path}")
        return False
    
    print("✅ System requirements met")
    return True

def setup_environment():
    """Set up the environment for the system"""
    print("🛠️  Setting up environment...")
    
    # Create necessary directories
    directories = ["logs", "state", "backups", "monitoring", "blockchain"]
    for directory in directories:
        Path(directory).mkdir(exist_ok=True)
    
    # Add current directory to Python path
    sys.path.insert(0, '.')
    
    print("✅ Environment setup complete")

def display_banner():
    """Display system banner"""
    banner = """
╔══════════════════════════════════════════════════════════════════╗
║                    SAUC THREE-AGENT SYSTEM                      ║
║                                                                  ║
║                     Mission Control Center v2                   ║
║                                                                  ║
║  🎯 ElizaOS: Strategic orchestrator & mission planning          ║
║  ⚡ Ananke:  Core execution engine & autonomous development      ║
║  ⏰ Chronos: DLT operations & temporal coordination              ║
║                                                                  ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  Ready for autonomous monorepo consolidation and management     ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
    """
    print(banner)

async def start_system():
    """Start the complete three-agent system"""
    try:
        # Import mission control (after environment setup)
        from mission_control_center_v2 import MissionControlCenter
        
        print("🚀 Starting Mission Control Center...")
        mission_control = MissionControlCenter()
        
        # Start the system
        await mission_control.start_system()
        
    except KeyboardInterrupt:
        print("\n🔴 System shutdown requested by user")
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("Please ensure all dependencies are installed:")
        print("   pip install PyYAML")
    except Exception as e:
        print(f"❌ System startup failed: {e}")
        return False
    
    return True

def main():
    """Main entry point"""
    try:
        # Display banner
        display_banner()
        
        # Check requirements
        if not check_requirements():
            print("\n❌ System requirements not met. Please fix the issues above.")
            sys.exit(1)
        
        # Setup environment
        setup_environment()
        
        # Start system
        print("\n🚀 Launching three-agent system...")
        print("💡 Tip: Press Ctrl+C to shutdown gracefully")
        print("📊 Real-time dashboard will start shortly...")
        print("-" * 50)
        
        # Run the system
        asyncio.run(start_system())
        
    except KeyboardInterrupt:
        print("\n🔴 Startup interrupted by user")
    except Exception as e:
        print(f"\n❌ Startup failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()