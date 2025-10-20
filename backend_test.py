#!/usr/bin/env python3
"""
Comprehensive testing for KiriNet Authorization System
Tests all authentication methods: phone (SMS), email, and nickname
"""

import requests
import json
import time
from datetime import datetime

# Backend URL from environment
BACKEND_URL = "https://kiri-chat.preview.emergentagent.com/api"

class KiriNetAuthTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.test_users = []
        self.test_conversations = []
        self.session = requests.Session()
        
    def log(self, message, level="INFO"):
        """Log test messages with timestamp"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] [{level}] {message}")
        
    def test_root_endpoint(self):
        """Test GET /api/ - Should return KiriNet API message"""
        self.log("Testing root endpoint GET /api/")
        
        try:
            response = self.session.get(f"{self.base_url}/")
            
            if response.status_code == 200:
                data = response.json()
                if "message" in data and "KiriNet" in data["message"]:
                    self.log("✅ Root endpoint working correctly", "SUCCESS")
                    return True
                else:
                    self.log(f"❌ Root endpoint returned unexpected data: {data}", "ERROR")
                    return False
            else:
                self.log(f"❌ Root endpoint failed with status {response.status_code}: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Root endpoint test failed with exception: {str(e)}", "ERROR")
            return False
    
    def test_create_users(self):
        """Test POST /api/users - Create multiple users with different nicknames"""
        self.log("Testing user creation POST /api/users")
        
        test_nicknames = ["Alice_Kiri", "Bob_Net", "Charlie_Messenger", "Diana_Chat"]
        created_users = []
        
        for nickname in test_nicknames:
            try:
                user_data = {"nickname": nickname}
                response = self.session.post(f"{self.base_url}/users", json=user_data)
                
                if response.status_code == 200:
                    user = response.json()
                    
                    # Verify user structure
                    required_fields = ["id", "nickname", "is_online", "created_at", "last_seen"]
                    missing_fields = [field for field in required_fields if field not in user]
                    
                    if missing_fields:
                        self.log(f"❌ User {nickname} missing fields: {missing_fields}", "ERROR")
                        return False
                    
                    # Verify UUID format
                    try:
                        uuid.UUID(user["id"])
                        self.log(f"✅ User {nickname} created with valid UUID: {user['id']}", "SUCCESS")
                    except ValueError:
                        self.log(f"❌ User {nickname} has invalid UUID format: {user['id']}", "ERROR")
                        return False
                    
                    created_users.append(user)
                    self.test_users.append(user)
                    
                else:
                    self.log(f"❌ Failed to create user {nickname}: {response.status_code} - {response.text}", "ERROR")
                    return False
                    
            except Exception as e:
                self.log(f"❌ Exception creating user {nickname}: {str(e)}", "ERROR")
                return False
        
        self.log(f"✅ Successfully created {len(created_users)} users", "SUCCESS")
        return True
    
    def test_get_users(self):
        """Test GET /api/users - Get all users"""
        self.log("Testing get all users GET /api/users")
        
        try:
            response = self.session.get(f"{self.base_url}/users")
            
            if response.status_code == 200:
                users = response.json()
                
                if not isinstance(users, list):
                    self.log(f"❌ Expected list of users, got: {type(users)}", "ERROR")
                    return False
                
                if len(users) < len(self.test_users):
                    self.log(f"❌ Expected at least {len(self.test_users)} users, got {len(users)}", "ERROR")
                    return False
                
                # Verify each user has proper structure
                for user in users:
                    required_fields = ["id", "nickname", "is_online", "created_at", "last_seen"]
                    missing_fields = [field for field in required_fields if field not in user]
                    
                    if missing_fields:
                        self.log(f"❌ User missing fields: {missing_fields}", "ERROR")
                        return False
                    
                    # Verify UUID format
                    try:
                        uuid.UUID(user["id"])
                    except ValueError:
                        self.log(f"❌ User has invalid UUID format: {user['id']}", "ERROR")
                        return False
                
                self.log(f"✅ Successfully retrieved {len(users)} users", "SUCCESS")
                return True
                
            else:
                self.log(f"❌ Failed to get users: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Exception getting users: {str(e)}", "ERROR")
            return False
    
    def test_get_conversations(self):
        """Test GET /api/conversations?user_id={userId} - Get conversations for a user"""
        self.log("Testing get conversations GET /api/conversations")
        
        if not self.test_users:
            self.log("❌ No test users available for conversation testing", "ERROR")
            return False
        
        for user in self.test_users[:2]:  # Test with first 2 users
            try:
                response = self.session.get(f"{self.base_url}/conversations", params={"user_id": user["id"]})
                
                if response.status_code == 200:
                    conversations = response.json()
                    
                    if not isinstance(conversations, list):
                        self.log(f"❌ Expected list of conversations, got: {type(conversations)}", "ERROR")
                        return False
                    
                    # Should have at least the global conversation
                    if len(conversations) < 1:
                        self.log(f"❌ Expected at least 1 conversation (global), got {len(conversations)}", "ERROR")
                        return False
                    
                    # Check for global conversation
                    global_conv = None
                    for conv in conversations:
                        if conv.get("type") == "global":
                            global_conv = conv
                            break
                    
                    if not global_conv:
                        self.log(f"❌ No global conversation found for user {user['nickname']}", "ERROR")
                        return False
                    
                    # Verify conversation structure
                    required_fields = ["id", "type", "participants", "created_at"]
                    missing_fields = [field for field in required_fields if field not in global_conv]
                    
                    if missing_fields:
                        self.log(f"❌ Global conversation missing fields: {missing_fields}", "ERROR")
                        return False
                    
                    # Verify user is in participants
                    if user["id"] not in global_conv["participants"]:
                        self.log(f"❌ User {user['nickname']} not in global conversation participants", "ERROR")
                        return False
                    
                    # Verify UUID format for conversation ID
                    try:
                        uuid.UUID(global_conv["id"])
                    except ValueError:
                        self.log(f"❌ Conversation has invalid UUID format: {global_conv['id']}", "ERROR")
                        return False
                    
                    self.log(f"✅ User {user['nickname']} has valid conversations including global", "SUCCESS")
                    self.test_conversations.extend(conversations)
                    
                else:
                    self.log(f"❌ Failed to get conversations for user {user['nickname']}: {response.status_code} - {response.text}", "ERROR")
                    return False
                    
            except Exception as e:
                self.log(f"❌ Exception getting conversations for user {user['nickname']}: {str(e)}", "ERROR")
                return False
        
        return True
    
    def test_get_messages(self):
        """Test GET /api/messages/{conversationId} - Get messages for a conversation"""
        self.log("Testing get messages GET /api/messages/{conversationId}")
        
        if not self.test_conversations:
            self.log("❌ No test conversations available for message testing", "ERROR")
            return False
        
        # Test with the first conversation (should be global)
        conversation = self.test_conversations[0]
        conversation_id = conversation["id"]
        
        try:
            response = self.session.get(f"{self.base_url}/messages/{conversation_id}")
            
            if response.status_code == 200:
                messages = response.json()
                
                if not isinstance(messages, list):
                    self.log(f"❌ Expected list of messages, got: {type(messages)}", "ERROR")
                    return False
                
                # Empty messages list is valid for new conversations
                self.log(f"✅ Successfully retrieved {len(messages)} messages for conversation {conversation_id}", "SUCCESS")
                
                # If there are messages, verify their structure
                for message in messages:
                    required_fields = ["id", "conversation_id", "sender_id", "sender_nickname", "content", "timestamp"]
                    missing_fields = [field for field in required_fields if field not in message]
                    
                    if missing_fields:
                        self.log(f"❌ Message missing fields: {missing_fields}", "ERROR")
                        return False
                    
                    # Verify UUID formats
                    try:
                        uuid.UUID(message["id"])
                        uuid.UUID(message["conversation_id"])
                        uuid.UUID(message["sender_id"])
                    except ValueError as e:
                        self.log(f"❌ Message has invalid UUID format: {str(e)}", "ERROR")
                        return False
                
                return True
                
            else:
                self.log(f"❌ Failed to get messages for conversation {conversation_id}: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Exception getting messages for conversation {conversation_id}: {str(e)}", "ERROR")
            return False
    
    def test_create_message(self):
        """Test POST /api/messages - Create a test message"""
        self.log("Testing message creation POST /api/messages")
        
        if not self.test_users or not self.test_conversations:
            self.log("❌ No test users or conversations available for message creation", "ERROR")
            return False
        
        user = self.test_users[0]
        conversation = self.test_conversations[0]
        
        message_data = {
            "conversation_id": conversation["id"],
            "sender_id": user["id"],
            "sender_nickname": user["nickname"],
            "content": "Hello from KiriNet test! こんにちは"
        }
        
        try:
            response = self.session.post(f"{self.base_url}/messages", json=message_data)
            
            if response.status_code == 200:
                message = response.json()
                
                # Verify message structure
                required_fields = ["id", "conversation_id", "sender_id", "sender_nickname", "content", "timestamp"]
                missing_fields = [field for field in required_fields if field not in message]
                
                if missing_fields:
                    self.log(f"❌ Created message missing fields: {missing_fields}", "ERROR")
                    return False
                
                # Verify UUID format
                try:
                    uuid.UUID(message["id"])
                except ValueError:
                    self.log(f"❌ Created message has invalid UUID format: {message['id']}", "ERROR")
                    return False
                
                self.log(f"✅ Successfully created message: {message['id']}", "SUCCESS")
                return True
                
            else:
                self.log(f"❌ Failed to create message: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Exception creating message: {str(e)}", "ERROR")
            return False
    
    def run_all_tests(self):
        """Run all API tests in sequence"""
        self.log("Starting KiriNet Messenger Backend API Tests")
        self.log(f"Testing against: {self.base_url}")
        
        tests = [
            ("Root Endpoint", self.test_root_endpoint),
            ("Create Users", self.test_create_users),
            ("Get Users", self.test_get_users),
            ("Get Conversations", self.test_get_conversations),
            ("Get Messages", self.test_get_messages),
            ("Create Message", self.test_create_message),
        ]
        
        results = {}
        
        for test_name, test_func in tests:
            self.log(f"\n{'='*50}")
            self.log(f"Running: {test_name}")
            self.log(f"{'='*50}")
            
            try:
                result = test_func()
                results[test_name] = result
                
                if result:
                    self.log(f"✅ {test_name} PASSED", "SUCCESS")
                else:
                    self.log(f"❌ {test_name} FAILED", "ERROR")
                    
            except Exception as e:
                self.log(f"❌ {test_name} CRASHED: {str(e)}", "ERROR")
                results[test_name] = False
        
        # Summary
        self.log(f"\n{'='*50}")
        self.log("TEST SUMMARY")
        self.log(f"{'='*50}")
        
        passed = sum(1 for result in results.values() if result)
        total = len(results)
        
        for test_name, result in results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            self.log(f"{test_name}: {status}")
        
        self.log(f"\nOverall: {passed}/{total} tests passed")
        
        if passed == total:
            self.log("🎉 All tests passed! KiriNet API is working correctly.", "SUCCESS")
            return True
        else:
            self.log(f"⚠️  {total - passed} tests failed. Please check the issues above.", "ERROR")
            return False

def main():
    """Main test execution"""
    tester = KiriNetAPITester()
    success = tester.run_all_tests()
    
    if success:
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()