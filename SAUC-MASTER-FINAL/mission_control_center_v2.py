#!/usr/bin/env python3
"""
Mission Control Center v2 - Three-Agent System Orchestrator
Coordinates ElizaOS, Ananke, and Chronos for autonomous operations
"""

import asyncio
import json
import logging
import signal
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict

# Agent imports
from ananke.elizaos_directs_ananke import ElizaOSDirector
from ananke.core.maximum_ananke import MaximumAnanke
from chronos.service import ChronosService

# Configure logging [[memory:6874409]]
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/mission_control.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

@dataclass
class SystemStatus:
    """System status structure"""
    elizaos_status: str
    ananke_status: str
    chronos_status: str
    mission_control_status: str
    active_missions: int
    last_health_check: str
    system_uptime: str

class MissionControlDashboard:
    """Dashboard for monitoring system status"""
    
    def __init__(self):
        self.start_time = datetime.now()
        self.health_checks: List[Dict[str, Any]] = []
        
    def display_status(self, status: SystemStatus) -> str:
        """Display formatted system status"""
        status_display = f"""
╔══════════════════════════════════════════════════════════════════╗
║                    MISSION CONTROL CENTER v2                    ║
║                   Three-Agent System Status                      ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║ 🎯 ElizaOS Director:     {status.elizaos_status:<15}           ║
║ ⚡ Ananke Core:          {status.ananke_status:<15}           ║
║ ⏰ Chronos Service:      {status.chronos_status:<15}           ║
║                                                                  ║
║ 🎮 Mission Control:      {status.mission_control_status:<15}           ║
║ 📋 Active Missions:      {status.active_missions:<15}           ║
║                                                                  ║
║ ⏱️  System Uptime:       {status.system_uptime:<15}           ║
║ 🔍 Last Health Check:    {status.last_health_check:<15}           ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
        """
        return status_display
    
    def record_health_check(self, agents_status: Dict[str, str]):
        """Record health check results"""
        health_check = {
            'timestamp': datetime.now().isoformat(),
            'agents': agents_status,
            'overall_health': all(status == 'active' for status in agents_status.values())
        }
        self.health_checks.append(health_check)
        
        # Keep only last 100 health checks
        if len(self.health_checks) > 100:
            self.health_checks = self.health_checks[-100:]

class MissionControlCenter:
    """
    Mission Control Center v2 - Main orchestrator for the three-agent system
    
    Responsibilities:
    - Initialize and monitor all three agents
    - Coordinate missions and operations
    - Provide real-time dashboard
    - Handle system health and recovery
    """
    
    def __init__(self):
        self.version = "2.0.0"
        self.status = "initializing"
        self.start_time = datetime.now()
        
        # Agent instances
        self.elizaos: Optional[ElizaOSDirector] = None
        self.ananke: Optional[MaximumAnanke] = None
        self.chronos: Optional[ChronosService] = None
        
        # System components
        self.dashboard = MissionControlDashboard()
        self.active_missions: Dict[str, Dict[str, Any]] = {}
        self.shutdown_requested = False
        
        # Configuration
        self.config = self._load_configuration()
        
        logger.info(f"Mission Control Center v{self.version} initializing")
    
    def _load_configuration(self) -> Dict[str, Any]:
        """Load system configuration"""
        config_path = Path("config/mission_control.yaml")
        
        # Default configuration
        default_config = {
            "agents": {
                "elizaos": {
                    "enabled": True,
                    "auto_start": True,
                    "health_check_interval": 30
                },
                "ananke": {
                    "enabled": True,
                    "auto_start": True,
                    "health_check_interval": 30
                },
                "chronos": {
                    "enabled": True,
                    "auto_start": True,
                    "health_check_interval": 30
                }
            },
            "mission_control": {
                "dashboard_refresh_rate": 5,
                "auto_recovery": True,
                "log_level": "INFO"
            },
            "consolidation": {
                "auto_start_mission": True,
                "backup_before_operations": True,
                "validation_required": True
            }
        }
        
        try:
            if config_path.exists():
                import yaml
                with open(config_path, 'r') as f:
                    loaded_config = yaml.safe_load(f)
                    # Merge with defaults
                    default_config.update(loaded_config)
        except ImportError:
            logger.warning("PyYAML not available, using default configuration")
        except Exception as e:
            logger.error(f"Failed to load configuration: {e}")
        
        return default_config
    
    async def initialize_system(self) -> bool:
        """Initialize the complete three-agent system"""
        logger.info("Initializing three-agent system")
        
        try:
            # Create necessary directories
            for directory in ["logs", "state", "config", "backups", "monitoring"]:
                Path(directory).mkdir(exist_ok=True)
            
            # Initialize agents in sequence
            initialization_results = []
            
            # 1. Initialize Chronos first (foundational services)
            if self.config["agents"]["chronos"]["enabled"]:
                logger.info("Initializing Chronos Service...")
                self.chronos = ChronosService()
                chronos_result = await self.chronos.initialize()
                initialization_results.append(("chronos", chronos_result))
                
                if chronos_result:
                    logger.info("✅ Chronos Service initialized successfully")
                else:
                    logger.error("❌ Chronos Service initialization failed")
            
            # 2. Initialize Ananke (core execution)
            if self.config["agents"]["ananke"]["enabled"]:
                logger.info("Initializing Maximum Ananke...")
                self.ananke = MaximumAnanke()
                ananke_result = await self.ananke.initialize()
                initialization_results.append(("ananke", ananke_result))
                
                if ananke_result:
                    logger.info("✅ Maximum Ananke initialized successfully")
                else:
                    logger.error("❌ Maximum Ananke initialization failed")
            
            # 3. Initialize ElizaOS (strategic director)
            if self.config["agents"]["elizaos"]["enabled"]:
                logger.info("Initializing ElizaOS Director...")
                self.elizaos = ElizaOSDirector()
                elizaos_result = await self.elizaos.initialize()
                initialization_results.append(("elizaos", elizaos_result))
                
                if elizaos_result:
                    logger.info("✅ ElizaOS Director initialized successfully")
                else:
                    logger.error("❌ ElizaOS Director initialization failed")
            
            # Check overall initialization
            successful_inits = [result[1] for result in initialization_results]
            if all(successful_inits):
                self.status = "active"
                logger.info("🎉 All agents initialized successfully!")
                
                # Auto-start consolidation mission if configured
                if self.config["consolidation"]["auto_start_mission"]:
                    await self._auto_start_consolidation_mission()
                
                return True
            else:
                failed_agents = [result[0] for result in initialization_results if not result[1]]
                logger.error(f"❌ Agent initialization failed: {failed_agents}")
                self.status = "degraded"
                return False
                
        except Exception as e:
            logger.error(f"System initialization failed: {e}")
            self.status = "error"
            return False
    
    async def _auto_start_consolidation_mission(self):
        """Auto-start the consolidation mission"""
        try:
            if self.elizaos:
                logger.info("🚀 Auto-starting consolidation mission")
                mission_id = await self.elizaos.plan_consolidation_mission()
                
                self.active_missions[mission_id] = {
                    'mission_id': mission_id,
                    'status': 'planned',
                    'auto_started': True,
                    'start_time': datetime.now().isoformat()
                }
                
                logger.info(f"📋 Consolidation mission planned: {mission_id}")
                
                # Start execution
                execution_result = await self.elizaos.execute_mission(mission_id)
                if execution_result:
                    logger.info("✅ Consolidation mission completed successfully")
                    self.active_missions[mission_id]['status'] = 'completed'
                else:
                    logger.error("❌ Consolidation mission failed")
                    self.active_missions[mission_id]['status'] = 'failed'
                    
        except Exception as e:
            logger.error(f"Auto-start consolidation mission failed: {e}")
    
    async def health_check(self) -> Dict[str, str]:
        """Perform health check on all agents"""
        agents_status = {}
        
        # Check ElizaOS
        if self.elizaos:
            agents_status['elizaos'] = self.elizaos.status
        else:
            agents_status['elizaos'] = 'not_initialized'
        
        # Check Ananke
        if self.ananke:
            agents_status['ananke'] = self.ananke.status
        else:
            agents_status['ananke'] = 'not_initialized'
        
        # Check Chronos
        if self.chronos:
            agents_status['chronos'] = self.chronos.status
        else:
            agents_status['chronos'] = 'not_initialized'
        
        # Record health check
        self.dashboard.record_health_check(agents_status)
        
        return agents_status
    
    async def get_system_status(self) -> SystemStatus:
        """Get comprehensive system status"""
        agents_status = await self.health_check()
        uptime = datetime.now() - self.start_time
        
        status = SystemStatus(
            elizaos_status=agents_status.get('elizaos', 'unknown'),
            ananke_status=agents_status.get('ananke', 'unknown'),
            chronos_status=agents_status.get('chronos', 'unknown'),
            mission_control_status=self.status,
            active_missions=len(self.active_missions),
            last_health_check=datetime.now().strftime("%H:%M:%S"),
            system_uptime=str(uptime).split('.')[0]  # Remove microseconds
        )
        
        return status
    
    async def start_mission(self, mission_type: str, **kwargs) -> str:
        """Start a new mission"""
        if not self.elizaos:
            raise ValueError("ElizaOS not initialized")
        
        logger.info(f"Starting mission: {mission_type}")
        
        if mission_type == "consolidation":
            mission_id = await self.elizaos.plan_consolidation_mission()
        else:
            # Generic mission creation
            mission_id = await self.elizaos.create_mission(
                name=mission_type,
                description=kwargs.get('description', f'{mission_type} mission'),
                priority=kwargs.get('priority', 'MEDIUM')
            )
        
        self.active_missions[mission_id] = {
            'mission_id': mission_id,
            'type': mission_type,
            'status': 'planned',
            'start_time': datetime.now().isoformat(),
            'kwargs': kwargs
        }
        
        return mission_id
    
    async def execute_mission(self, mission_id: str) -> bool:
        """Execute a planned mission"""
        if mission_id not in self.active_missions:
            logger.error(f"Mission not found: {mission_id}")
            return False
        
        if not self.elizaos:
            logger.error("ElizaOS not available for mission execution")
            return False
        
        logger.info(f"Executing mission: {mission_id}")
        
        try:
            # Update mission status
            self.active_missions[mission_id]['status'] = 'executing'
            self.active_missions[mission_id]['execution_start'] = datetime.now().isoformat()
            
            # Execute through ElizaOS
            result = await self.elizaos.execute_mission(mission_id)
            
            # Update mission status
            if result:
                self.active_missions[mission_id]['status'] = 'completed'
                logger.info(f"✅ Mission completed successfully: {mission_id}")
            else:
                self.active_missions[mission_id]['status'] = 'failed'
                logger.error(f"❌ Mission execution failed: {mission_id}")
            
            self.active_missions[mission_id]['execution_end'] = datetime.now().isoformat()
            return result
            
        except Exception as e:
            logger.error(f"Mission execution error: {e}")
            self.active_missions[mission_id]['status'] = 'error'
            self.active_missions[mission_id]['error'] = str(e)
            return False
    
    async def emergency_shutdown(self):
        """Emergency shutdown of all agents"""
        logger.warning("🚨 Emergency shutdown initiated")
        
        self.shutdown_requested = True
        self.status = "shutting_down"
        
        # Attempt graceful shutdown of agents
        shutdown_tasks = []
        
        if self.elizaos:
            shutdown_tasks.append(self._shutdown_agent("elizaos", self.elizaos))
        
        if self.ananke:
            shutdown_tasks.append(self._shutdown_agent("ananke", self.ananke))
        
        if self.chronos:
            shutdown_tasks.append(self._shutdown_agent("chronos", self.chronos))
        
        # Wait for all agents to shutdown (with timeout)
        try:
            await asyncio.wait_for(
                asyncio.gather(*shutdown_tasks, return_exceptions=True),
                timeout=30.0
            )
        except asyncio.TimeoutError:
            logger.error("Shutdown timeout - forcing termination")
        
        self.status = "shutdown"
        logger.info("🔴 System shutdown complete")
    
    async def _shutdown_agent(self, agent_name: str, agent_instance):
        """Shutdown individual agent"""
        try:
            logger.info(f"Shutting down {agent_name}...")
            # Most agents don't have explicit shutdown methods, 
            # so we just update their status
            if hasattr(agent_instance, 'status'):
                agent_instance.status = "shutdown"
            logger.info(f"✅ {agent_name} shutdown complete")
        except Exception as e:
            logger.error(f"Error shutting down {agent_name}: {e}")
    
    async def run_dashboard(self):
        """Run the real-time dashboard"""
        logger.info("🖥️  Starting Mission Control Dashboard")
        
        try:
            while not self.shutdown_requested:
                # Clear screen (ANSI escape codes)
                print("\033[2J\033[H")
                
                # Get current status
                status = await self.get_system_status()
                
                # Display dashboard
                dashboard_display = self.dashboard.display_status(status)
                print(dashboard_display)
                
                # Show active missions
                if self.active_missions:
                    print("\n📋 ACTIVE MISSIONS:")
                    for mission_id, mission_info in self.active_missions.items():
                        status_emoji = {
                            'planned': '📝',
                            'executing': '⚡',
                            'completed': '✅',
                            'failed': '❌',
                            'error': '🚨'
                        }.get(mission_info['status'], '❓')
                        
                        print(f"   {status_emoji} {mission_id[:8]}... - {mission_info['status']} - {mission_info.get('type', 'unknown')}")
                
                # Show recent health check
                if self.dashboard.health_checks:
                    latest_health = self.dashboard.health_checks[-1]
                    health_emoji = "🟢" if latest_health['overall_health'] else "🔴"
                    print(f"\n{health_emoji} System Health: {'HEALTHY' if latest_health['overall_health'] else 'ISSUES DETECTED'}")
                
                print(f"\n⏱️  Dashboard refresh rate: {self.config['mission_control']['dashboard_refresh_rate']}s")
                print("Press Ctrl+C to shutdown system")
                
                # Wait for next refresh
                await asyncio.sleep(self.config['mission_control']['dashboard_refresh_rate'])
                
        except KeyboardInterrupt:
            logger.info("Dashboard shutdown requested")
        except Exception as e:
            logger.error(f"Dashboard error: {e}")
    
    async def start_system(self):
        """Start the complete system with dashboard"""
        # Setup signal handlers
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
        
        try:
            # Initialize system
            logger.info("🚀 Starting Mission Control Center v2")
            
            if await self.initialize_system():
                logger.info("✅ System initialization complete")
                
                # Start dashboard
                await self.run_dashboard()
            else:
                logger.error("❌ System initialization failed")
                return False
                
        except Exception as e:
            logger.error(f"System startup failed: {e}")
            return False
        finally:
            await self.emergency_shutdown()
    
    def _signal_handler(self, signum, frame):
        """Handle shutdown signals"""
        logger.info(f"Received signal {signum}, initiating shutdown")
        self.shutdown_requested = True

async def main():
    """Main entry point"""
    print("""
╔══════════════════════════════════════════════════════════════════╗
║                    MISSION CONTROL CENTER v2                    ║
║                                                                  ║
║           Three-Agent Autonomous System Orchestrator             ║
║                                                                  ║
║  🎯 ElizaOS: Strategic orchestrator & mission planning          ║
║  ⚡ Ananke:  Core execution engine & autonomous development      ║
║  ⏰ Chronos: DLT operations & temporal coordination              ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
    """)
    
    # Create and start mission control
    mission_control = MissionControlCenter()
    await mission_control.start_system()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n🔴 Shutdown requested by user")
    except Exception as e:
        print(f"❌ Fatal error: {e}")
        sys.exit(1)