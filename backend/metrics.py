"""
Metrics Collection Utilities
"""

import time
from typing import Dict, Any
from collections import defaultdict

class MetricsCollector:
    """Collect and track application metrics"""
    
    def __init__(self):
        self.metrics = defaultdict(int)
        self.timings = defaultdict(list)
    
    def increment(self, metric_name: str, value: int = 1):
        """Increment a counter metric"""
        self.metrics[metric_name] += value
    
    def record_timing(self, metric_name: str, duration: float):
        """Record a timing metric"""
        self.timings[metric_name].append(duration)
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get all collected metrics"""
        return {
            "counters": dict(self.metrics),
            "timings": {
                name: {
                    "count": len(values),
                    "avg": sum(values) / len(values) if values else 0,
                    "min": min(values) if values else 0,
                    "max": max(values) if values else 0
                }
                for name, values in self.timings.items()
            }
        }
    
    def reset(self):
        """Reset all metrics"""
        self.metrics.clear()
        self.timings.clear()
