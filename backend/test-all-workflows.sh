#!/bin/bash
echo "=== BẮT ĐẦU KIỂM TOÁN HỆ THỐNG 3 LUỒNG (PRODUCTION MODE) ==="

echo -e "\n1. MongoDB collections (vku-ai-support):"
docker exec -i vku-mongo mongosh vku-ai-support --quiet --eval "printjson(db.getCollectionNames())"

echo -e "\n2. Kiểm tra kết nối Supabase Cloud (Postgres):"
curl -s -o /dev/null -w "Supabase REST Gateway: HTTP %{http_code}\n" https://foqiadfeageiubjlpcbs.supabase.co

echo -e "\n3. Ping n8n Production Webhook Luồng 1 (Course Registration):"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" -X POST http://localhost:5678/webhook/course-registration -H "Content-Type: application/json" -d '{}'

echo -e "\n4. Ping n8n Production Webhook Luồng 2 (Academic Warning):"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" -X POST http://localhost:5678/webhook/academic-warning-alert -H "Content-Type: application/json" -d '{}'

echo -e "\n5. Ping n8n Production Webhook Luồng 3 (Offline Attendance):"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" -X POST http://localhost:5678/webhook/attendance-offline-sync -H "Content-Type: application/json" -d '{}'

echo -e "\n=== HOÀN TẤT KIỂM TOÁN ==="
