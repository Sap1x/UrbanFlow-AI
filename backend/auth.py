"""
UrbanFlow Command Center — Authentication & RBAC (Priority 10)
Stub implementation for production authentication.
"""
from fastapi import Request, HTTPException, Depends
from typing import Optional

class User:
    def __init__(self, user_id: str, role: str):
        self.user_id = user_id
        self.role = role

def get_current_user(request: Request) -> User:
    """
    Dependency to get the current authenticated user.
    In production, this would parse a JWT from the Authorization header.
    """
    # Mocking a default user for local development
    auth_header = request.headers.get("Authorization", "")
    if "Bearer " in auth_header:
        token = auth_header.split(" ")[1]
        # In a real app, decode token here
        return User(user_id="prod_user_123", role="admin")
        
    return User(user_id="dev_local", role="operator")

def require_role(allowed_roles: list[str]):
    """Decorator dependency to enforce Role-Based Access Control."""
    def role_checker(user: User = Depends(get_current_user)):
        if user.role not in allowed_roles and user.role != "admin":
            raise HTTPException(status_code=403, detail="Insufficient permissions for this operation.")
        return user
    return role_checker
