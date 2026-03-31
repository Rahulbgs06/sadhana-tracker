-- MySQL dump 10.13  Distrib 9.6.0, for macos26.2 (arm64)
--
-- Host: interchange.proxy.rlwy.net    Database: railway
-- ------------------------------------------------------
-- Server version	9.4.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `marks_config`
--

DROP TABLE IF EXISTS `marks_config`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `marks_config` (
  `id` int NOT NULL AUTO_INCREMENT,
  `voice_name` varchar(100) NOT NULL,
  `config_data` json NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `voice_name` (`voice_name`),
  KEY `created_by` (`created_by`),
  KEY `updated_by` (`updated_by`),
  KEY `idx_voice` (`voice_name`),
  KEY `idx_active` (`is_active`),
  CONSTRAINT `marks_config_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `marks_config_ibfk_2` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `marks_config`
--

LOCK TABLES `marks_config` WRITE;
/*!40000 ALTER TABLE `marks_config` DISABLE KEYS */;
INSERT INTO `marks_config` VALUES (1,'all','{\"rules\": {\"body\": [{\"id\": \"earlyWakeup\", \"name\": \"Early Wakeup\", \"type\": \"time\", \"field\": \"wakeup_time\", \"maxMarks\": 25, \"conditions\": [{\"marks\": 25, \"value\": \"04:30\", \"operator\": \"<=\"}, {\"marks\": 20, \"value\": \"05:00\", \"operator\": \"<=\"}, {\"marks\": 15, \"value\": \"05:30\", \"operator\": \"<=\"}, {\"marks\": 10, \"value\": \"06:00\", \"operator\": \"<=\"}, {\"marks\": 5, \"value\": \"06:30\", \"operator\": \"<=\"}]}, {\"id\": \"earlyToBed\", \"name\": \"Early to Bed\", \"type\": \"time\", \"field\": \"to_bed_time\", \"maxMarks\": 25, \"conditions\": [{\"marks\": 25, \"value\": \"21:30\", \"operator\": \"<=\"}, {\"marks\": 20, \"value\": \"22:00\", \"operator\": \"<=\"}, {\"marks\": 15, \"value\": \"22:30\", \"operator\": \"<=\"}, {\"marks\": 10, \"value\": \"23:00\", \"operator\": \"<=\"}, {\"marks\": 5, \"value\": \"23:30\", \"operator\": \"<=\"}]}, {\"id\": \"templeReach\", \"name\": \"Temple Reach\", \"type\": \"time\", \"field\": \"temp_hall_rech\", \"maxMarks\": 25, \"conditions\": [{\"marks\": 25, \"value\": \"04:30\", \"operator\": \"<=\"}, {\"marks\": 20, \"value\": \"05:00\", \"operator\": \"<=\"}, {\"marks\": 15, \"value\": \"05:30\", \"operator\": \"<=\"}, {\"marks\": 10, \"value\": \"06:00\", \"operator\": \"<=\"}, {\"marks\": 5, \"value\": \"06:30\", \"operator\": \"<=\"}]}, {\"id\": \"dayRest\", \"name\": \"Day Rest\", \"type\": \"duration\", \"field\": \"day_rest_marks\", \"maxMarks\": 25, \"conditions\": [{\"marks\": 25, \"value\": 15, \"operator\": \"<=\"}, {\"marks\": 20, \"value\": 30, \"operator\": \"<=\"}, {\"marks\": 15, \"value\": 45, \"operator\": \"<=\"}, {\"marks\": 10, \"value\": 60, \"operator\": \"<=\"}, {\"marks\": 5, \"value\": 75, \"operator\": \"<=\"}]}, {\"id\": \"study\", \"name\": \"Study\", \"type\": \"duration\", \"field\": \"study_minutes\", \"maxMarks\": 25, \"conditions\": [{\"marks\": 25, \"value\": 30, \"operator\": \"<=\"}, {\"marks\": 20, \"value\": 60, \"operator\": \"<=\"}, {\"marks\": 15, \"value\": 90, \"operator\": \"<=\"}, {\"marks\": 10, \"value\": 120, \"operator\": \"<=\"}]}], \"japa\": [{\"id\": \"japaRounds\", \"name\": \"Japa Rounds\", \"type\": \"slab\", \"field\": \"rounds\", \"maxMarks\": 25, \"conditions\": [{\"marks\": 25, \"value\": 16, \"operator\": \">=\"}, {\"marks\": 20, \"value\": 15, \"operator\": \">=\"}, {\"marks\": 15, \"value\": 14, \"operator\": \">=\"}, {\"marks\": 10, \"value\": 13, \"operator\": \">=\"}, {\"marks\": 5, \"value\": 12, \"operator\": \">=\"}]}], \"soul\": [{\"id\": \"hearing\", \"name\": \"Hearing\", \"type\": \"boolean\", \"field\": \"hearing_minutes\", \"maxMarks\": 5, \"conditions\": [{\"marks\": 5, \"value\": 0, \"operator\": \">\"}]}, {\"id\": \"reading\", \"name\": \"Reading\", \"type\": \"boolean\", \"field\": \"reading_minutes\", \"maxMarks\": 5, \"conditions\": [{\"marks\": 5, \"value\": 0, \"operator\": \">\"}]}, {\"id\": \"cleanliness\", \"name\": \"Cleanliness\", \"type\": \"boolean\", \"field\": \"cleanliness\", \"maxMarks\": 5, \"conditions\": [{\"marks\": 5, \"value\": 1, \"operator\": \"=\"}]}, {\"id\": \"morningClass\", \"name\": \"Morning Class\", \"type\": \"boolean\", \"field\": \"morning_class\", \"maxMarks\": 5, \"conditions\": [{\"marks\": 5, \"value\": 1, \"operator\": \"=\"}]}, {\"id\": \"mangalaArti\", \"name\": \"Mangala Arti\", \"type\": \"boolean\", \"field\": \"mangala_aarti\", \"maxMarks\": 5, \"conditions\": [{\"marks\": 5, \"value\": 1, \"operator\": \"=\"}]}]}}',1,1,NULL,'2026-03-15 09:22:08','2026-03-15 09:22:08');
/*!40000 ALTER TABLE `marks_config` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `marks_config_history`
--

DROP TABLE IF EXISTS `marks_config_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `marks_config_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `config_id` int NOT NULL,
  `changed_by` int DEFAULT NULL,
  `old_config` json DEFAULT NULL,
  `new_config` json DEFAULT NULL,
  `change_reason` text,
  `changed_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `changed_by` (`changed_by`),
  KEY `idx_config` (`config_id`),
  KEY `idx_changed_at` (`changed_at`),
  CONSTRAINT `marks_config_history_ibfk_1` FOREIGN KEY (`config_id`) REFERENCES `marks_config` (`id`) ON DELETE CASCADE,
  CONSTRAINT `marks_config_history_ibfk_2` FOREIGN KEY (`changed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `marks_config_history`
--

LOCK TABLES `marks_config_history` WRITE;
/*!40000 ALTER TABLE `marks_config_history` DISABLE KEYS */;
/*!40000 ALTER TABLE `marks_config_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sadhana_entries`
--

DROP TABLE IF EXISTS `sadhana_entries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sadhana_entries` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `voice_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Surbhikunj Voice',
  `entry_date` date NOT NULL,
  `wakeup_time` time DEFAULT NULL,
  `rounds` int DEFAULT '0',
  `chanting_end_time` time DEFAULT NULL,
  `hearing_minutes` int DEFAULT '0',
  `reading_minutes` int DEFAULT '0',
  `study_minutes` int DEFAULT '0',
  `day_rest_time` time DEFAULT NULL,
  `day_rest_minutes` int DEFAULT '0',
  `sleep_time` time DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `to_bed` int DEFAULT '0',
  `wake_up` int DEFAULT '0',
  `day_rest_marks` int DEFAULT '0',
  `morning_class` tinyint(1) DEFAULT '0',
  `mangala_aarti` tinyint(1) DEFAULT '0',
  `cleanliness` tinyint(1) DEFAULT '0',
  `book_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reflections` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `temp_hall_rech` time DEFAULT NULL,
  `time_wasted` time DEFAULT NULL,
  `body_marks` int DEFAULT '0',
  `body_percent` int DEFAULT '0',
  `soul_marks` int DEFAULT '0',
  `soul_percent` int DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_date` (`user_id`,`entry_date`),
  KEY `idx_user_date` (`user_id`,`entry_date`),
  CONSTRAINT `sadhana_entries_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=36 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sadhana_entries`
--

LOCK TABLES `sadhana_entries` WRITE;
/*!40000 ALTER TABLE `sadhana_entries` DISABLE KEYS */;
INSERT INTO `sadhana_entries` VALUES (1,2,'Surbhikunj Voice','2026-03-09','04:00:00',16,'08:30:00',60,30,45,NULL,0,'21:30:00','2026-03-09 11:03:04',0,0,0,0,0,0,NULL,NULL,NULL,NULL,0,0,0,0),(3,4,'Surbhikunj Voice','2026-03-10','04:30:00',12,'06:30:00',23,32,56,NULL,0,'21:30:00','2026-03-10 15:17:50',0,0,0,0,0,0,NULL,NULL,NULL,NULL,0,0,0,0),(4,4,'Surbhikunj Voice','2026-03-09','04:00:00',16,'06:30:00',23,32,56,NULL,0,'21:30:00','2026-03-10 15:18:17',0,0,0,0,0,0,NULL,NULL,NULL,NULL,0,0,0,0),(6,14,'vrindavan','2026-03-11','05:18:12',16,'18:18:19',10,20,30,'09:18:30',0,'22:09:37','2026-03-11 10:32:50',0,0,0,0,0,0,NULL,NULL,NULL,NULL,0,0,0,0),(10,14,'vrindavan','2026-03-10','04:30:00',16,'06:45:00',20,10,30,NULL,0,'21:41:41','2026-03-11 11:09:54',0,0,0,0,0,0,NULL,NULL,NULL,NULL,0,0,0,0),(12,14,'vrindavan','2026-03-09','04:44:56',16,'06:45:05',10,10,10,'08:45:00',0,'21:30:00','2026-03-11 11:15:37',0,0,0,0,0,0,NULL,NULL,NULL,NULL,0,0,0,0),(14,14,'vrindavan','2026-03-07','05:15:59',16,'07:16:04',23,44,90,'05:16:00',0,'21:12:00','2026-03-11 11:46:36',0,0,0,0,0,0,NULL,NULL,NULL,NULL,0,0,0,0),(16,14,'vrindavan','2026-03-08','05:33:33',16,'06:33:28',12,20,10,NULL,0,'21:33:37','2026-03-11 12:03:47',0,0,0,0,0,0,NULL,NULL,NULL,NULL,0,0,0,0),(19,14,'vrindavan','2026-03-06','05:33:33',16,'06:33:28',12,20,10,NULL,0,'21:33:37','2026-03-11 12:04:33',0,0,0,0,0,0,NULL,NULL,NULL,NULL,0,0,0,0),(20,14,'vrindavan','2026-03-05','05:33:33',16,'06:33:28',12,20,10,NULL,0,'21:33:37','2026-03-11 12:05:02',0,0,0,0,0,0,NULL,NULL,NULL,NULL,0,0,0,0),(21,14,'vrindavan','2026-03-04','05:33:33',16,'06:33:28',12,0,10,NULL,0,'21:33:37','2026-03-11 12:05:26',0,0,0,0,0,0,NULL,NULL,NULL,NULL,0,0,0,0),(22,15,'vrindavan','2026-03-11','04:14:01',16,NULL,0,0,0,NULL,0,NULL,'2026-03-11 12:44:08',0,0,0,0,0,0,NULL,NULL,NULL,NULL,0,0,0,0),(23,14,'vrindavan','2026-03-12','06:36:45',16,NULL,0,0,0,NULL,0,NULL,'2026-03-12 03:06:53',0,0,0,0,0,0,NULL,NULL,NULL,NULL,0,0,0,0),(27,16,'vrindavan','2026-03-13','16:46:46',16,'16:46:57',0,0,0,NULL,0,'16:47:25','2026-03-13 11:17:35',0,0,0,0,0,0,NULL,NULL,'16:47:00','00:00:09',0,0,30,46),(28,17,'Surabhi Gunj','2026-03-13','19:54:00',16,'19:53:00',30,20,30,NULL,0,'18:55:00','2026-03-13 13:25:52',0,0,0,1,1,1,'120 mint ',NULL,'04:30:00',NULL,0,0,60,92),(29,14,'vrindavan','2026-03-14','04:20:34',16,'06:26:44',10,30,0,NULL,0,'21:30:00','2026-03-14 11:43:33',0,0,0,1,1,1,'NA','NA','05:00:00',NULL,0,0,55,85),(30,18,'Surabhikunj Voice ','2026-03-14','05:14:40',16,'07:14:48',0,0,0,NULL,0,'21:30:00','2026-03-14 11:45:19',0,0,0,1,1,1,'NA','NA','05:14:00',NULL,0,0,43,65),(31,19,'Surbhikunj voice','2026-03-14','04:25:00',16,'07:18:00',0,0,0,NULL,0,'22:00:00','2026-03-14 11:49:11',0,0,0,1,1,1,NULL,NULL,'04:59:00',NULL,0,0,43,65),(32,14,'vrindavan','2026-03-18','04:19:00',16,'06:34:00',0,15,60,NULL,10,'21:32:00','2026-03-18 14:45:06',20,25,25,1,1,1,'Na','Na','04:49:00','00:20:00',70,93,45,90),(35,21,'Surabhikunj','2026-03-18','04:00:00',16,'20:10:00',0,0,1,NULL,60,'21:12:00','2026-03-18 15:43:23',25,25,15,1,1,1,NULL,NULL,'16:26:00','03:00:00',65,87,15,30);
/*!40000 ALTER TABLE `sadhana_entries` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sadhana_records`
--

DROP TABLE IF EXISTS `sadhana_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sadhana_records` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `date` date DEFAULT NULL,
  `wakeup_time` time DEFAULT NULL,
  `rounds` int DEFAULT NULL,
  `chanting_end_time` time DEFAULT NULL,
  `hearing_minutes` int DEFAULT NULL,
  `reading_minutes` int DEFAULT NULL,
  `study_minutes` int DEFAULT NULL,
  `day_rest_minutes` int DEFAULT NULL,
  `sleep_time` time DEFAULT NULL,
  `to_bed` int DEFAULT '0',
  `wake_up` int DEFAULT '0',
  `day_rest_marks` int DEFAULT '0',
  `morning_class` tinyint(1) DEFAULT '0',
  `mangala_aarti` tinyint(1) DEFAULT '0',
  `cleanliness` tinyint(1) DEFAULT '0',
  `book_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reflections` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `temp_hall_rech` time DEFAULT NULL,
  `time_wasted` time DEFAULT NULL,
  `body_marks` int DEFAULT '0',
  `body_percent` decimal(5,2) DEFAULT '0.00',
  `soul_marks` int DEFAULT '0',
  `soul_percent` decimal(5,2) DEFAULT '0.00',
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_date_unique` (`user_id`,`date`),
  CONSTRAINT `sadhana_records_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sadhana_records`
--

LOCK TABLES `sadhana_records` WRITE;
/*!40000 ALTER TABLE `sadhana_records` DISABLE KEYS */;
/*!40000 ALTER TABLE `sadhana_records` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_role` enum('devotee','admin','developer') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'devotee',
  `user_group` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `voice_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Surbhikunj Voice',
  `phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Admin','admin@sadhna.com','$2b$10$0U56IylDAmW1YReojWGA2OKPTaHqJY6k9TM9E8DQOWQumJbExveuO','admin','Sahdev','Surbhikunj Voice',NULL,'2026-03-09 10:35:58'),(2,'Test Devotee','test@example.com','$2b$10$krvIAnvtaodj0LbqmPwdCeTV6CDweRMsBYEsw6auNhMqSgDGtLMFq','devotee','Yudhisthir','Surbhikunj Voice','9876543210','2026-03-09 10:57:22'),(4,'Aman Kumar','aman@gmail.com','$2b$10$0UheAEbwVxaR9ZIYZOsh/eMKrKbqSvXpjrr4AYMaYXze1zpylubk6','devotee','Sahdev','Surbhikunj Voice','6206431233','2026-03-10 15:17:08'),(6,'Dev Prabhu','dev@sadhna.com','$2b$10$N9qo8uLOickgx2ZMRZoMy.MrAJqLqY5ZR3qXcXqXcXqXcXqXcXqX','devotee','Sahdev','Surbhikunj Voice',NULL,'2026-03-11 05:12:17'),(14,'Rahul Kumar','rahulbgs06@gmail.com','$2b$10$I/u2aPtr50.9bLwhaIqEYOw/lESzBAmFyJIaqedPIOwVY798CrjZa','admin','Yudhisthir','vrindavan',NULL,'2026-03-11 10:15:00'),(15,'Abhay','abhay@email.com','$2b$10$JOZ6EyoW3nab1sSaZPvcGeo0.3jIGA8ZOYPq3eQKgipb2SRZ0g5Xi','devotee','Yudhisthir','vrindavan',NULL,'2026-03-11 12:43:40'),(16,'Sagar','sagar@gmail.com','$2b$10$MYzNwuoyfnrxMbJSrwmkUuru4WQdWq7t6JdDyaPIko4iiNHxPBhWG','devotee','Bheem','vrindavan',NULL,'2026-03-13 07:22:01'),(17,'Rishabh Kumar ','rishubgs123@gmail.com','$2b$10$cqLJ.X56hrGuulNA7tzg8eajkyHl2w46iD02kN0ciXH5M3T8.T4Ue','devotee','Nakul','Surabhi Gunj',NULL,'2026-03-13 13:19:22'),(18,'Yash','yash@yahoo.com','$2b$10$ESnPVjQ5Rz6YiK7COkheTeOip6LOF00pSxbG0vydS1N/iSjfR68xC','devotee','Sahdev','Surabhikunj Voice ',NULL,'2026-03-14 11:40:15'),(19,'Demo user','user@gmail.com','$2b$10$7TspzpV24cBedXrVjz5Iw.P5kwRe6ftq42OlHIGKz/kNzwmj7Ry/G','devotee','Sahdev','Surbhikunj voice',NULL,'2026-03-14 11:48:03'),(20,'Aman Khandelwal','amankhandelwalgn@gmail.com','$2b$10$TgAEc0DRlxdIOQe.RpfCRO4Z.gZHA1AR7CnXds.tJeNMHRfbeo.rO','devotee','Sahdev','Surbhikunj',NULL,'2026-03-18 02:59:01'),(21,'Sagar','sagargunte@gmail.com','$2b$10$rxOPYD3HvB533fkdOnseEenpF3LUqque/pEUJfDZjte5gj86Qar26','devotee','Bheem','Surabhikunj',NULL,'2026-03-18 15:40:06');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `voices`
--

DROP TABLE IF EXISTS `voices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `voices` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `voices`
--

LOCK TABLES `voices` WRITE;
/*!40000 ALTER TABLE `voices` DISABLE KEYS */;
INSERT INTO `voices` VALUES (1,'Surbhikunj Voice','2026-03-11 04:56:57');
/*!40000 ALTER TABLE `voices` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'railway'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-03-30 19:01:26
