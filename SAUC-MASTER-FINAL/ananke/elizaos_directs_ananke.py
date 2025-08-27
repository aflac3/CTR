#!/usr/bin/env python3
"""
ElizaOS Strategic Director for Ananke Agent System
Implements the strategic orchestration and mission planning capabilities
"""

import asyncio
import json
import logging
import uuid
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from pathlib import Path

from ananke.core.maximum_ananke import MaximumAnanke
from chronos.service import ChronosService

# Configure logging [[memory:6874409]]
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/elizaos.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

@dataclass
class Mission:
    """Mission definition structure"""
    id: str
    name: str
    description: str
    priority: str
    status: str
    success_criteria: List[str]
    agent_assignments: Dict[str, List[str]]
    created_at: str
    updated_at: str
    progress: float = 0.0
    
class RiskAssessment:
    """Risk assessment for mission operations"""
    
    def __init__(self):
        self.risk_levels = {
            'LOW': 0.2,
            'MEDIUM': 0.5,
            'HIGH': 0.8,
            'CRITICAL': 1.0
        }
    
    def assess_consolidation_risk(self, file_operations: List[Dict]) -> Dict[str, Any]:
        """Assess risk for file consolidation operations"""
        risk_factors = {
            'file_count': len(file_operations),
            'has_duplicates': any(op.get('duplicate', False) for op in file_operations),
            'system_files': any('config' in op.get('path', '') for op in file_operations),
            'code_files': any(op.get('path', '').endswith(('.py', '.js', '.ts')) for op in file_operations)
        }
        
        # Calculate risk score
        risk_score = 0.0
        if risk_factors['file_count'] > 100:
            risk_score += 0.3
        if risk_factors['has_duplicates']:
            risk_score += 0.2
        if risk_factors['system_files']:
            risk_score += 0.4
        if risk_factors['code_files']:
            risk_score += 0.1
            
        risk_level = 'LOW'
        if risk_score > 0.8:
            risk_level = 'CRITICAL'
        elif risk_score > 0.5:
            risk_level = 'HIGH'
        elif risk_score > 0.2:
            risk_level = 'MEDIUM'
            
        return {
            'risk_score': risk_score,
            'risk_level': risk_level,
            'factors': risk_factors,
            'recommendations': self._generate_recommendations(risk_level, risk_factors)
        }
    
    def _generate_recommendations(self, risk_level: str, factors: Dict) -> List[str]:
        """Generate risk mitigation recommendations"""
        recommendations = []
        
        if risk_level in ['HIGH', 'CRITICAL']:
            recommendations.append("Create full backup before proceeding")
            recommendations.append("Implement incremental consolidation approach")
            
        if factors.get('system_files'):
            recommendations.append("Review system file changes carefully")
            
        if factors.get('file_count', 0) > 100:
            recommendations.append("Process files in smaller batches")
            
        return recommendations

class StrategicPlanner:
    """Strategic planning and mission orchestration"""
    
    def __init__(self):
        self.risk_assessor = RiskAssessment()
        
    def create_consolidation_plan(self, duplicate_analysis: Dict) -> Dict[str, Any]:
        """Create strategic plan for monorepo consolidation"""
        logger.info("Creating strategic consolidation plan")
        
        # Analyze consolidation scope
        total_files = duplicate_analysis.get('total_files', 0)
        duplicate_files = duplicate_analysis.get('duplicate_files', [])
        redundant_modules = duplicate_analysis.get('redundant_modules', [])
        
        # Create phased approach
        phases = [
            {
                'phase': 1,
                'name': 'Analysis & Backup',
                'description': 'Create backups and analyze dependencies',
                'tasks': [
                    'Create full system backup',
                    'Analyze file dependencies',
                    'Generate consolidation report'
                ]
            },
            {
                'phase': 2,
                'name': 'Safe Consolidation',
                'description': 'Remove obvious duplicates and merge simple files',
                'tasks': [
                    'Remove exact duplicate files',
                    'Merge configuration files',
                    'Consolidate documentation'
                ]
            },
            {
                'phase': 3,
                'name': 'Module Integration',
                'description': 'Merge redundant modules and update dependencies',
                'tasks': [
                    'Merge redundant Python modules',
                    'Update import statements',
                    'Resolve dependency conflicts'
                ]
            },
            {
                'phase': 4,
                'name': 'Validation & Optimization',
                'description': 'Test consolidated system and optimize structure',
                'tasks': [
                    'Run comprehensive tests',
                    'Validate all functionality',
                    'Optimize directory structure'
                ]
            }
        ]
        
        # Risk assessment
        file_operations = []
        if isinstance(duplicate_files, list):
            for item in duplicate_files:
                if isinstance(item, str):
                    file_operations.append({'path': item, 'duplicate': True})
                elif isinstance(item, list):
                    # Handle nested lists from duplicate analysis
                    for f in item:
                        file_operations.append({'path': f, 'duplicate': True})
        
        risk_assessment = self.risk_assessor.assess_consolidation_risk(file_operations)
        
        plan = {
            'scope': {
                'total_files': total_files,
                'duplicate_count': len(duplicate_files),
                'module_count': len(redundant_modules)
            },
            'phases': phases,
            'risk_assessment': risk_assessment,
            'estimated_duration': self._estimate_duration(len(duplicate_files), len(redundant_modules)),
            'success_metrics': [
                'Zero data loss',
                'All tests passing',
                'Reduced file count by >30%',
                'Improved system performance'
            ]
        }
        
        return plan
    
    def _estimate_duration(self, duplicate_count: int, module_count: int) -> str:
        """Estimate consolidation duration"""
        base_time = 30  # minutes
        file_time = duplicate_count * 0.5  # 30 seconds per duplicate
        module_time = module_count * 5  # 5 minutes per module
        
        total_minutes = base_time + file_time + module_time
        hours = int(total_minutes // 60)
        minutes = int(total_minutes % 60)
        
        return f"{hours}h {minutes}m"

class ElizaOSDirector:
    """
    ElizaOS Strategic Director - Orchestrates the three-agent system
    🎯 ElizaOS: Strategic orchestrator, mission planning, risk assessment
    """
    
    def __init__(self):
        self.agent_id = "elizaos-director"
        self.version = "1.0.0"
        self.status = "initializing"
        self.missions: Dict[str, Mission] = {}
        self.strategic_planner = StrategicPlanner()
        
        # Agent connections
        self.ananke_agent: Optional[MaximumAnanke] = None
        self.chronos_service: Optional[ChronosService] = None
        
        logger.info(f"ElizaOS Director v{self.version} initializing")
    
    async def initialize(self) -> bool:
        """Initialize ElizaOS and connect to other agents"""
        try:
            logger.info("Initializing ElizaOS Director")
            
            # Initialize Ananke connection
            self.ananke_agent = MaximumAnanke()
            await self.ananke_agent.initialize()
            
            # Initialize Chronos connection
            self.chronos_service = ChronosService()
            await self.chronos_service.initialize()
            
            self.status = "active"
            logger.info("ElizaOS Director successfully initialized")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize ElizaOS Director: {e}")
            self.status = "error"
            return False
    
    async def create_mission(self, name: str, description: str, priority: str = "MEDIUM") -> str:
        """Create a new mission and assign to agents"""
        mission_id = str(uuid.uuid4())
        
        mission = Mission(
            id=mission_id,
            name=name,
            description=description,
            priority=priority,
            status="created",
            success_criteria=[],
            agent_assignments={},
            created_at=datetime.now().isoformat(),
            updated_at=datetime.now().isoformat()
        )
        
        self.missions[mission_id] = mission
        logger.info(f"Created mission: {name} (ID: {mission_id})")
        
        return mission_id
    
    async def plan_consolidation_mission(self) -> str:
        """Plan and create the monorepo consolidation mission"""
        logger.info("Planning monorepo consolidation mission")
        
        # Create mission
        mission_id = await self.create_mission(
            name="SAUC Monorepo Consolidation",
            description="Eliminate duplicate files, merge redundant modules, create unified structure",
            priority="HIGH"
        )
        
        # Get current mission
        mission = self.missions[mission_id]
        
        # Define success criteria
        mission.success_criteria = [
            "Eliminate duplicate files across all SAUC directories",
            "Merge redundant modules and dependencies", 
            "Create unified directory structure",
            "Preserve all functionality and data",
            "Reduce overall file count by minimum 30%",
            "All tests pass after consolidation"
        ]
        
        # Assign agent roles
        mission.agent_assignments = {
            "elizaos": [
                "Analyze monorepo structure",
                "Identify consolidation opportunities", 
                "Create consolidation plan",
                "Monitor and validate progress"
            ],
            "ananke": [
                "Execute file operations",
                "Perform code analysis", 
                "Merge modules and resolve dependencies",
                "Handle self-healing for failed operations"
            ],
            "chronos": [
                "Handle DLT-related consolidation",
                "Update blockchain manifests",
                "Coordinate temporal operations",
                "Provide verification and proof engine"
            ]
        }
        
        mission.status = "planned"
        mission.updated_at = datetime.now().isoformat()
        
        # Create strategic plan using Ananke's analysis
        if self.ananke_agent:
            duplicate_analysis = await self.ananke_agent.analyze_duplicates()
            strategic_plan = self.strategic_planner.create_consolidation_plan(duplicate_analysis)
            
            # Store plan in mission state
            mission_state_path = Path(f"state/mission_{mission_id}.json")
            mission_state_path.parent.mkdir(exist_ok=True)
            
            with open(mission_state_path, 'w') as f:
                json.dump({
                    'mission': asdict(mission),
                    'strategic_plan': strategic_plan
                }, f, indent=2)
        
        logger.info(f"Consolidation mission planned successfully: {mission_id}")
        return mission_id
    
    async def execute_mission(self, mission_id: str) -> bool:
        """Execute a mission using all three agents"""
        if mission_id not in self.missions:
            logger.error(f"Mission {mission_id} not found")
            return False
            
        mission = self.missions[mission_id]
        logger.info(f"Executing mission: {mission.name}")
        
        try:
            mission.status = "executing"
            mission.updated_at = datetime.now().isoformat()
            
            # Load strategic plan
            mission_state_path = Path(f"state/mission_{mission_id}.json")
            if mission_state_path.exists():
                with open(mission_state_path, 'r') as f:
                    mission_data = json.load(f)
                    strategic_plan = mission_data.get('strategic_plan', {})
            else:
                strategic_plan = {}
            
            # Execute phases sequentially
            phases = strategic_plan.get('phases', [])
            for phase in phases:
                logger.info(f"Executing Phase {phase['phase']}: {phase['name']}")
                
                # Delegate tasks to appropriate agents
                for task in phase['tasks']:
                    success = await self._execute_task(task, mission_id)
                    if not success:
                        logger.error(f"Task failed: {task}")
                        mission.status = "failed"
                        return False
                
                # Update progress
                mission.progress = (phase['phase'] / len(phases)) * 100
                mission.updated_at = datetime.now().isoformat()
            
            mission.status = "completed"
            mission.progress = 100.0
            mission.updated_at = datetime.now().isoformat()
            
            logger.info(f"Mission completed successfully: {mission.name}")
            return True
            
        except Exception as e:
            logger.error(f"Mission execution failed: {e}")
            mission.status = "failed"
            return False
    
    async def _execute_task(self, task: str, mission_id: str) -> bool:
        """Execute individual task by delegating to appropriate agent"""
        logger.info(f"Executing task: {task}")
        
        try:
            # Route tasks to appropriate agents
            if "backup" in task.lower():
                # Ananke handles file operations
                return await self.ananke_agent.create_backup()
                
            elif "analyze" in task.lower() and "dependencies" in task.lower():
                return await self.ananke_agent.analyze_dependencies()
                
            elif "remove" in task.lower() and "duplicate" in task.lower():
                return await self.ananke_agent.remove_duplicates()
                
            elif "merge" in task.lower():
                if "module" in task.lower():
                    return await self.ananke_agent.merge_modules()
                else:
                    return await self.ananke_agent.merge_files()
                    
            elif "test" in task.lower():
                return await self.ananke_agent.run_tests()
                
            elif "blockchain" in task.lower() or "dlt" in task.lower():
                # Chronos handles DLT operations
                return await self.chronos_service.update_blockchain_manifest()
                
            else:
                # Default to Ananke for general tasks
                return await self.ananke_agent.execute_task(task)
                
        except Exception as e:
            logger.error(f"Task execution failed: {task} - {e}")
            return False
    
    async def get_mission_status(self, mission_id: str) -> Optional[Dict[str, Any]]:
        """Get current mission status and progress"""
        if mission_id not in self.missions:
            return None
            
        mission = self.missions[mission_id]
        return {
            'mission': asdict(mission),
            'agents_status': {
                'elizaos': self.status,
                'ananke': self.ananke_agent.status if self.ananke_agent else 'disconnected',
                'chronos': self.chronos_service.status if self.chronos_service else 'disconnected'
            }
        }
    
    async def enhanced_conversation_mode(self, query: str) -> str:
        """Enhanced conversation capabilities for strategic planning"""
        logger.info(f"Processing strategic query: {query}")
        
        # Enhanced conversation logic
        if "consolidation" in query.lower() or "monorepo" in query.lower():
            return self._generate_consolidation_insight(query)
        elif "risk" in query.lower():
            return self._generate_risk_analysis(query)
        elif "mission" in query.lower():
            return self._generate_mission_insight(query)
        else:
            return self._generate_general_insight(query)
    
    def _generate_consolidation_insight(self, query: str) -> str:
        """Generate insights about consolidation strategy"""
        return """
        Strategic Consolidation Analysis:
        
        1. Current monorepo contains multiple SAUC versions with significant overlap
        2. Estimated 40-60% duplicate content across directories
        3. Key consolidation opportunities:
           - Unified agent architecture (ElizaOS, Ananke, Chronos)
           - Merged configuration systems
           - Consolidated documentation
           - Unified testing framework
        
        Recommended approach: Phased consolidation with continuous validation
        """
    
    def _generate_risk_analysis(self, query: str) -> str:
        """Generate risk analysis insights"""
        return """
        Risk Assessment Summary:
        
        PRIMARY RISKS:
        - Data loss during file operations (MEDIUM)
        - Breaking dependencies during module merging (HIGH)
        - Configuration conflicts (MEDIUM)
        
        MITIGATION STRATEGIES:
        - Full backup before operations
        - Incremental consolidation approach
        - Comprehensive testing at each phase
        - Rollback procedures for failed operations
        """
    
    def _generate_mission_insight(self, query: str) -> str:
        """Generate mission-related insights"""
        active_missions = [m for m in self.missions.values() if m.status in ['executing', 'planned']]
        return f"""
        Mission Control Status:
        
        Active Missions: {len(active_missions)}
        System Status: {self.status}
        
        Current Focus: Monorepo consolidation for improved system efficiency
        Next Phase: Autonomous execution with continuous monitoring
        """
    
    def _generate_general_insight(self, query: str) -> str:
        """Generate general strategic insights"""
        return """
        ElizaOS Strategic Director is active and monitoring system operations.
        
        Capabilities:
        - Mission planning and orchestration
        - Risk assessment and mitigation
        - Strategic decision making
        - Multi-agent coordination
        
        Ready to assist with strategic planning and mission execution.
        """

async def main():
    """Main execution function for testing"""
    director = ElizaOSDirector()
    
    # Initialize the system
    if await director.initialize():
        print("ElizaOS Director initialized successfully")
        
        # Create and plan consolidation mission
        mission_id = await director.plan_consolidation_mission()
        print(f"Consolidation mission created: {mission_id}")
        
        # Get mission status
        status = await director.get_mission_status(mission_id)
        if status:
            print("Mission Status:", json.dumps(status, indent=2))
    else:
        print("Failed to initialize ElizaOS Director")

if __name__ == "__main__":
    asyncio.run(main())