-- MySQL dump 10.13  Distrib 8.0.45, for Linux (aarch64)
--
-- Host: localhost    Database: sadhana_tracker
-- ------------------------------------------------------
-- Server version	8.0.45

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
-- Table structure for table `sadhana_entries`
--

DROP TABLE IF EXISTS `sadhana_entries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sadhana_entries` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `voice_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT 'Surbhikunj Voice',
  `entry_date` date NOT NULL,
  `wakeup_time` time DEFAULT NULL,
  `rounds` int DEFAULT '0',
  `chanting_end_time` time DEFAULT NULL,
  `hearing_minutes` int DEFAULT '0',
  `reading_minutes` int DEFAULT '0',
  `study_minutes` int DEFAULT '0',
  `day_rest_time` time DEFAULT NULL,
  `sleep_time` time DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `to_bed` int DEFAULT '0',
  `wake_up` int DEFAULT '0',
  `day_rest_marks` int DEFAULT '0',
  `morning_class` tinyint(1) DEFAULT '0',
  `mangala_aarti` tinyint(1) DEFAULT '0',
  `cleanliness` tinyint(1) DEFAULT '0',
  `book_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reflections` text COLLATE utf8mb4_unicode_ci,
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
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sadhana_entries`
--

LOCK TABLES `sadhana_entries` WRITE;
/*!40000 ALTER TABLE `sadhana_entries` DISABLE KEYS */;
INSERT INTO `sadhana_entries` VALUES (1,2,'Surbhikunj Voice','2026-03-09','04:00:00',16,'08:30:00',60,30,45,NULL,'21:30:00','2026-03-09 11:03:04',0,0,0,0,0,0,NULL,NULL,NULL,NULL,0,0,0,0),(3,4,'Surbhikunj Voice','2026-03-10','04:30:00',12,'06:30:00',23,32,56,NULL,'21:30:00','2026-03-10 15:17:50',0,0,0,0,0,0,NULL,NULL,NULL,NULL,0,0,0,0),(4,4,'Surbhikunj Voice','2026-03-09','04:00:00',16,'06:30:00',23,32,56,NULL,'21:30:00','2026-03-10 15:18:17',0,0,0,0,0,0,NULL,NULL,NULL,NULL,0,0,0,0),(6,14,'vrindavan','2026-03-11','05:18:12',16,'18:18:19',10,20,30,'09:18:30','22:09:37','2026-03-11 10:32:50',0,0,0,0,0,0,NULL,NULL,NULL,NULL,0,0,0,0),(10,14,'vrindavan','2026-03-10','04:30:00',16,'06:45:00',20,10,30,NULL,'21:41:41','2026-03-11 11:09:54',0,0,0,0,0,0,NULL,NULL,NULL,NULL,0,0,0,0),(12,14,'vrindavan','2026-03-09','04:44:56',16,'06:45:05',10,10,10,'08:45:00','21:30:00','2026-03-11 11:15:37',0,0,0,0,0,0,NULL,NULL,NULL,NULL,0,0,0,0),(14,14,'vrindavan','2026-03-07','05:15:59',16,'07:16:04',23,44,90,'05:16:00','21:12:00','2026-03-11 11:46:36',0,0,0,0,0,0,NULL,NULL,NULL,NULL,0,0,0,0),(16,14,'vrindavan','2026-03-08','05:33:33',16,'06:33:28',12,20,10,NULL,'21:33:37','2026-03-11 12:03:47',0,0,0,0,0,0,NULL,NULL,NULL,NULL,0,0,0,0),(19,14,'vrindavan','2026-03-06','05:33:33',16,'06:33:28',12,20,10,NULL,'21:33:37','2026-03-11 12:04:33',0,0,0,0,0,0,NULL,NULL,NULL,NULL,0,0,0,0),(20,14,'vrindavan','2026-03-05','05:33:33',16,'06:33:28',12,20,10,NULL,'21:33:37','2026-03-11 12:05:02',0,0,0,0,0,0,NULL,NULL,NULL,NULL,0,0,0,0),(21,14,'vrindavan','2026-03-04','05:33:33',16,'06:33:28',12,0,10,NULL,'21:33:37','2026-03-11 12:05:26',0,0,0,0,0,0,NULL,NULL,NULL,NULL,0,0,0,0),(22,15,'vrindavan','2026-03-11','04:14:01',16,NULL,0,0,0,NULL,NULL,'2026-03-11 12:44:08',0,0,0,0,0,0,NULL,NULL,NULL,NULL,0,0,0,0),(23,14,'vrindavan','2026-03-12','06:36:45',16,NULL,0,0,0,NULL,NULL,'2026-03-12 03:06:53',0,0,0,0,0,0,NULL,NULL,NULL,NULL,0,0,0,0);
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
  `book_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reflections` text COLLATE utf8mb4_unicode_ci,
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
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_role` enum('devotee','admin','developer') COLLATE utf8mb4_unicode_ci DEFAULT 'devotee',
  `user_group` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `voice_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT 'Surbhikunj Voice',
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Admin','admin@sadhna.com','$2b$10$0U56IylDAmW1YReojWGA2OKPTaHqJY6k9TM9E8DQOWQumJbExveuO','developer','Sahdev','Surbhikunj Voice',NULL,'2026-03-09 10:35:58'),(2,'Test Devotee','test@example.com','$2b$10$krvIAnvtaodj0LbqmPwdCeTV6CDweRMsBYEsw6auNhMqSgDGtLMFq','devotee','Yudhisthir','Surbhikunj Voice','9876543210','2026-03-09 10:57:22'),(4,'Aman Kumar','aman@gmail.com','$2b$10$0UheAEbwVxaR9ZIYZOsh/eMKrKbqSvXpjrr4AYMaYXze1zpylubk6','devotee','Sahdev','Surbhikunj Voice','6206431233','2026-03-10 15:17:08'),(6,'Dev Prabhu','dev@sadhna.com','$2a$10$7p.mU6K/r6.Y3X.w.xXvO.Zp8Z6eG9Y.vW4O1k5X6z6f6G6G6G6G','developer','Sahdev','Surbhikunj Voice',NULL,'2026-03-11 05:12:17'),(14,'Rahul Kumar','rahulbgs06@gmail.com','$2b$10$I/u2aPtr50.9bLwhaIqEYOw/lESzBAmFyJIaqedPIOwVY798CrjZa','devotee','Yudhisthir','vrindavan',NULL,'2026-03-11 10:15:00'),(15,'Abhay','abhay@email.com','$2b$10$JOZ6EyoW3nab1sSaZPvcGeo0.3jIGA8ZOYPq3eQKgipb2SRZ0g5Xi','devotee','Yudhisthir','vrindavan',NULL,'2026-03-11 12:43:40');
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
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
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
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-03-12 13:02:53
