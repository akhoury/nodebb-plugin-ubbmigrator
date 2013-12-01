-- phpMyAdmin SQL Dump
-- version 3.5.1
-- http://www.phpmyadmin.net
--
-- Host: localhost
-- Generation Time: Nov 27, 2013 at 01:04 AM
-- Server version: 5.5.25
-- PHP Version: 5.3.14

SET SQL_MODE="NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;

--
-- Database: `ubb_tiny`
--

-- --------------------------------------------------------

--
-- Table structure for table `ubbt_FORUMS`
--

CREATE TABLE IF NOT EXISTS `ubbt_FORUMS` (
  `FORUM_TITLE` text,
  `FORUM_DESCRIPTION` text,
  `FORUM_ID` int(9) unsigned NOT NULL AUTO_INCREMENT,
  `FORUM_PARENT` int(9) unsigned DEFAULT NULL,
  `FORUM_POSTS` int(9) unsigned DEFAULT '0',
  `FORUM_LAST_POST_TIME` int(11) unsigned DEFAULT NULL,
  `FORUM_CREATED_ON` int(11) unsigned DEFAULT NULL,
  `CATEGORY_ID` int(4) unsigned NOT NULL DEFAULT '1',
  `FORUM_TOPICS` int(9) unsigned DEFAULT '0',
  `FORUM_SORT_ORDER` int(4) unsigned DEFAULT NULL,
  `FORUM_DEFAULT_TOPIC_AGE` int(4) unsigned DEFAULT NULL,
  `FORUM_CUSTOM_HEADER` int(1) unsigned DEFAULT NULL,
  `FORUM_STYLE` mediumint(4) NOT NULL DEFAULT '0',
  `FORUM_LAST_POST_ID` int(9) unsigned DEFAULT '0',
  `FORUM_LAST_TOPIC_ID` int(9) unsigned DEFAULT NULL,
  `FORUM_LAST_POSTER_ID` int(9) DEFAULT '1',
  `FORUM_LAST_POSTER_NAME` varchar(64) DEFAULT NULL,
  `FORUM_LAST_POST_SUBJECT` text,
  `FORUM_LAST_POST_ICON` varchar(30) DEFAULT NULL,
  `FORUM_IMAGE` varchar(255) DEFAULT NULL,
  `FORUM_IS_ACTIVE` tinyint(1) unsigned NOT NULL DEFAULT '1',
  `FORUM_ISLAND_INSERT` mediumint(5) NOT NULL DEFAULT '0',
  `FORUM_IS_RSS` tinyint(1) NOT NULL DEFAULT '0',
  `FORUM_RSS_TITLE` varchar(255) DEFAULT NULL,
  `FORUM_SHOW_INTRO` tinyint(1) unsigned NOT NULL DEFAULT '0',
  `FORUM_INTRO_TITLE` varchar(255) DEFAULT NULL,
  `FORUM_IS_TEASER` tinyint(1) NOT NULL DEFAULT '0',
  `FORUM_IS_GALLERY` tinyint(1) NOT NULL DEFAULT '0',
  `FORUM_ACTIVE_POSTS` tinyint(1) DEFAULT '1',
  `FORUM_POSTS_COUNT` tinyint(1) DEFAULT '1',
  `FORUM_SORT_FIELD` varchar(10) DEFAULT NULL,
  `FORUM_SORT_DIR` varchar(4) DEFAULT NULL,
  PRIMARY KEY (`FORUM_ID`),
  UNIQUE KEY `INDX1` (`FORUM_ID`),
  KEY `CAT_NDX` (`CATEGORY_ID`),
  KEY `ACTIVE_NDX` (`FORUM_IS_ACTIVE`)
) ENGINE=MyISAM  DEFAULT CHARSET=latin1 AUTO_INCREMENT=22 ;

--
-- Dumping data for table `ubbt_FORUMS`
--

INSERT INTO `ubbt_FORUMS` (`FORUM_TITLE`, `FORUM_DESCRIPTION`, `FORUM_ID`, `FORUM_PARENT`, `FORUM_POSTS`, `FORUM_LAST_POST_TIME`, `FORUM_CREATED_ON`, `CATEGORY_ID`, `FORUM_TOPICS`, `FORUM_SORT_ORDER`, `FORUM_DEFAULT_TOPIC_AGE`, `FORUM_CUSTOM_HEADER`, `FORUM_STYLE`, `FORUM_LAST_POST_ID`, `FORUM_LAST_TOPIC_ID`, `FORUM_LAST_POSTER_ID`, `FORUM_LAST_POSTER_NAME`, `FORUM_LAST_POST_SUBJECT`, `FORUM_LAST_POST_ICON`, `FORUM_IMAGE`, `FORUM_IS_ACTIVE`, `FORUM_ISLAND_INSERT`, `FORUM_IS_RSS`, `FORUM_RSS_TITLE`, `FORUM_SHOW_INTRO`, `FORUM_INTRO_TITLE`, `FORUM_IS_TEASER`, `FORUM_IS_GALLERY`, `FORUM_ACTIVE_POSTS`, `FORUM_POSTS_COUNT`, `FORUM_SORT_FIELD`, `FORUM_SORT_DIR`) VALUES
('ForumTitle1', 'Forum Description 1', 1, 0, 6139, 1382441276, 1002543608, 1, 1161, 3, 0, 0, 0, 361143, 30387, 90, 'user1', '', 'book.gif', '', 1, 0, 0, NULL, 0, '', 0, 0, 1, 1, NULL, NULL),
('ForumTitle2', 'Forum Description 2', 2, 0, 39037, 1382589890, 1002543608, 1, 4442, 1, 0, 0, 0, 361150, 4708, 20908, 'user2', '', 'book.gif', '', 1, 0, 0, NULL, 0, '', 0, 0, 1, 1, NULL, NULL),
('ForumTitle3', 'Forum Description 3', 3, 0, 6022, 1378714028, 1002543608, 1, 446, 4, 0, 0, 0, 361025, 27200, 20354, 'user3', '', 'book.gif', '', 1, 0, 0, NULL, 0, '', 0, 0, 1, 1, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `ubbt_POSTS`
--

CREATE TABLE IF NOT EXISTS `ubbt_POSTS` (
  `POST_ID` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `POST_PARENT_ID` int(11) unsigned NOT NULL DEFAULT '0',
  `TOPIC_ID` int(11) unsigned NOT NULL DEFAULT '0',
  `POST_IS_TOPIC` tinyint(1) NOT NULL DEFAULT '0',
  `POST_POSTED_TIME` int(11) unsigned NOT NULL DEFAULT '0',
  `POST_POSTER_IP` varchar(60) DEFAULT NULL,
  `POST_SUBJECT` text,
  `POST_BODY` text,
  `POST_DEFAULT_BODY` text,
  `POST_IS_APPROVED` tinyint(1) NOT NULL DEFAULT '1',
  `POST_ICON` varchar(30) DEFAULT NULL,
  `POST_IS_MEMBER_POST` tinyint(1) DEFAULT '1',
  `POST_HAS_POLL` tinyint(1) DEFAULT NULL,
  `POST_HAS_FILE` tinyint(1) DEFAULT NULL,
  `POST_MARKUP_TYPE` varchar(10) DEFAULT 'markup',
  `POST_LAST_EDITED_TIME` int(11) DEFAULT NULL,
  `POST_LAST_EDITED_BY` varchar(64) DEFAULT NULL,
  `USER_ID` int(9) unsigned NOT NULL DEFAULT '0',
  `POST_PARENT_USER_ID` int(9) unsigned NOT NULL DEFAULT '0',
  `POST_ADD_SIGNATURE` int(1) NOT NULL DEFAULT '0',
  `POST_LAST_EDIT_REASON` varchar(255) DEFAULT NULL,
  `POST_POSTER_NAME` varchar(50) DEFAULT NULL,
  `POST_MD5` varchar(32) DEFAULT NULL,
  PRIMARY KEY (`POST_ID`),
  KEY `indx_1` (`POST_PARENT_ID`),
  KEY `indx_2` (`TOPIC_ID`),
  KEY `indx_3` (`POST_POSTED_TIME`),
  KEY `indx4` (`POST_IS_APPROVED`),
  KEY `ID_ndx` (`USER_ID`),
  KEY `MD5_ndx` (`POST_MD5`),
  FULLTEXT KEY `POST_SUBJECT` (`POST_SUBJECT`,`POST_DEFAULT_BODY`)
) ENGINE=MyISAM  DEFAULT CHARSET=latin1 AUTO_INCREMENT=361152 ;

--
-- Dumping data for table `ubbt_POSTS`
--

INSERT INTO `ubbt_POSTS` (`POST_ID`, `POST_PARENT_ID`, `TOPIC_ID`, `POST_IS_TOPIC`, `POST_POSTED_TIME`, `POST_POSTER_IP`, `POST_SUBJECT`, `POST_BODY`, `POST_DEFAULT_BODY`, `POST_IS_APPROVED`, `POST_ICON`, `POST_IS_MEMBER_POST`, `POST_HAS_POLL`, `POST_HAS_FILE`, `POST_MARKUP_TYPE`, `POST_LAST_EDITED_TIME`, `POST_LAST_EDITED_BY`, `USER_ID`, `POST_PARENT_USER_ID`, `POST_ADD_SIGNATURE`, `POST_LAST_EDIT_REASON`, `POST_POSTER_NAME`, `POST_MD5`) VALUES
(1, 0, 1, 1, 972942000, '204.95.180.13', 'Topic Subject 1', 'Post Body 1', 'Post Body 1', 1, 'book.gif', 0, 0, 0, 'markup', 0, '', 1, 0, 1, NULL, NULL, NULL),
(2, 0, 2, 1, 992224320, '205.188.195.31', 'Topic Subject 2', 'Post Body 2', 'Post Body 2', 1, 'book.gif', 0, 0, 0, 'markup', 0, '', 2, 0, 1, NULL, NULL, NULL),
(3, 0, 3, 1, 1014324180, '199.172.188.9', 'Topic Subject 3', 'Post Body 3', 'Post Body 3', 1, 'laugh.gif', 0, 0, 0, 'markup', 0, '', 3, 0, 1, NULL, NULL, NULL),
(4, 0, 4, 1, 992261580, '63.42.162.136', 'Topic Subject 5', 'Post Body 4', 'Post Body 4', 1, 'book.gif', 0, 0, 0, 'markup', 0, '', 4, 0, 1, NULL, NULL, NULL),
(5, 0, 5, 1, 1055807226, '131.252.165.168', 'Topic Subject 5', 'Post Body 5', 'Post Body 5', 1, 'book.gif', 0, 0, 0, 'markup', 0, '', 5, 0, 1, NULL, NULL, NULL),
(6, 1, 1, 0, 1056914027, '68.62.246.97', 'Re: Topic Subject 1', 'Post Body 1.1', 'Post Body 1.1', 1, 'book.gif', 0, 0, 0, 'markup', 1056914056, '', 3, 0, 1, NULL, NULL, NULL),
(7, 2, 2, 0, 1057379367, '64.78.65.120', 'Re: Topic Subject 2', 'Post Body 1.2', 'Post Body 1.2', 1, 'book.gif', 0, 0, 0, 'markup', 0, '', 1, 0, 1, NULL, NULL, NULL),
(8, 3, 3, 0, 992265360, '12.145.208.12', 'Re: Topic Subject 3', 'Post Body 1.3', 'Post Body 1.3', 1, 'exclamation.gif', 0, 0, 0, 'markup', 0, '', 2, 0, 1, NULL, NULL, NULL),
(9, 4, 4, 0, 992913360, '64.12.105.168', 'Re: Topic Subject 4', 'Post Body 1.4', 'Post Body 1.4', 1, 'crazy.gif', 0, 0, 0, 'markup', 0, '', 5, 0, 1, NULL, NULL, NULL),
(10, 5, 5, 0, 992965260, '209.218.84.245', 'Re: Topic Subject 5', 'Post Body 1.5', 'Post Body 1.5', 1, 'book.gif', 0, 0, 0, 'markup', 0, '', 4, 0, 1, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `ubbt_TOPICS`
--

CREATE TABLE IF NOT EXISTS `ubbt_TOPICS` (
  `TOPIC_ID` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `FORUM_ID` int(9) unsigned NOT NULL DEFAULT '0',
  `POST_ID` int(11) unsigned NOT NULL DEFAULT '0',
  `USER_ID` int(9) unsigned NOT NULL DEFAULT '0',
  `TOPIC_VIEWS` int(5) NOT NULL DEFAULT '0',
  `TOPIC_REPLIES` int(11) NOT NULL DEFAULT '0',
  `TOPIC_SUBJECT` varchar(255) DEFAULT NULL,
  `TOPIC_RATING` int(1) NOT NULL DEFAULT '0',
  `TOPIC_TOTAL_RATES` mediumint(6) NOT NULL DEFAULT '0',
  `TOPIC_CREATED_TIME` int(11) unsigned DEFAULT NULL,
  `TOPIC_ICON` varchar(30) DEFAULT NULL,
  `TOPIC_IS_APPROVED` tinyint(1) NOT NULL DEFAULT '1',
  `TOPIC_STATUS` char(1) DEFAULT NULL,
  `TOPIC_IS_STICKY` tinyint(1) NOT NULL DEFAULT '0',
  `TOPIC_LAST_REPLY_TIME` int(11) unsigned NOT NULL DEFAULT '0',
  `TOPIC_LAST_POST_ID` int(11) DEFAULT NULL,
  `TOPIC_LAST_POSTER_NAME` varchar(64) DEFAULT NULL,
  `TOPIC_LAST_POSTER_ID` int(11) unsigned DEFAULT NULL,
  `TOPIC_HAS_FILE` tinyint(1) NOT NULL DEFAULT '0',
  `TOPIC_HAS_POLL` tinyint(1) NOT NULL DEFAULT '0',
  `TOPIC_IS_EVENT` tinyint(1) NOT NULL DEFAULT '0',
  `TOPIC_NEWS_ICON` varchar(64) DEFAULT NULL,
  `TOPIC_POSTER_NAME` varchar(50) DEFAULT NULL,
  `TOPIC_THUMBNAIL` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`TOPIC_ID`),
  KEY `FORUM_NDX` (`FORUM_ID`),
  KEY `POST_NDX` (`POST_ID`),
  KEY `USER_NDX` (`USER_ID`),
  KEY `TOPIC_TIME_NDX` (`FORUM_ID`,`TOPIC_CREATED_TIME`),
  KEY `TOPIC_LAST_TIME_NDX` (`FORUM_ID`,`TOPIC_LAST_REPLY_TIME`),
  KEY `APPROVED_NDX` (`TOPIC_IS_APPROVED`),
  KEY `TOPIC_LAST_REPLY_NDX` (`TOPIC_LAST_REPLY_TIME`)
) ENGINE=MyISAM  DEFAULT CHARSET=latin1 AUTO_INCREMENT=30390 ;

--
-- Dumping data for table `ubbt_TOPICS`
--

INSERT INTO `ubbt_TOPICS` (`TOPIC_ID`, `FORUM_ID`, `POST_ID`, `USER_ID`, `TOPIC_VIEWS`, `TOPIC_REPLIES`, `TOPIC_SUBJECT`, `TOPIC_RATING`, `TOPIC_TOTAL_RATES`, `TOPIC_CREATED_TIME`, `TOPIC_ICON`, `TOPIC_IS_APPROVED`, `TOPIC_STATUS`, `TOPIC_IS_STICKY`, `TOPIC_LAST_REPLY_TIME`, `TOPIC_LAST_POST_ID`, `TOPIC_LAST_POSTER_NAME`, `TOPIC_LAST_POSTER_ID`, `TOPIC_HAS_FILE`, `TOPIC_HAS_POLL`, `TOPIC_IS_EVENT`, `TOPIC_NEWS_ICON`, `TOPIC_POSTER_NAME`, `TOPIC_THUMBNAIL`) VALUES
(1, 1, 1, 1, 1897, 0, 'Topic Subject 1', 0, 0, 972942000, 'book.gif', 1, 'O', 0, 972942000, 1, '', 1, 0, 0, 0, NULL, NULL, NULL),
(2, 2, 2, 2, 1708, 1, 'Topic Subject 2', 0, 0, 992224320, 'book.gif', 1, 'O', 1, 1014324180, 3, '', 1, 0, 0, 0, NULL, NULL, NULL),
(3, 3, 3, 3, 1752, 3, 'Topic Subject 3', 0, 0, 992261580, 'book.gif', 1, 'O', 0, 1057379367, 7, '', 94, 0, 0, 0, NULL, NULL, NULL),
(4, 2, 3, 4, 1973, 0, 'Topic Subject 4', 0, 0, 992265360, 'exclamation.gif', 1, 'O', 1, 992265360, 8, '', 1, 0, 0, 0, NULL, NULL, NULL),
(5, 1, 5, 5, 3499, 2, 'Topic Subject 5', 0, 0, 992913360, 'crazy.gif', 1, 'O', 0, 993653340, 11, '', 1, 0, 0, 0, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `ubbt_USERS`
--

CREATE TABLE IF NOT EXISTS `ubbt_USERS` (
  `USER_ID` int(9) NOT NULL AUTO_INCREMENT,
  `USER_LOGIN_NAME` varchar(64) NOT NULL DEFAULT '',
  `USER_DISPLAY_NAME` varchar(64) NOT NULL DEFAULT '',
  `USER_PASSWORD` varchar(32) NOT NULL DEFAULT '',
  `USER_MEMBERSHIP_LEVEL` varchar(15) NOT NULL DEFAULT 'User',
  `USER_REGISTRATION_EMAIL` varchar(50) DEFAULT NULL,
  `USER_REGISTRATION_IP` varchar(15) DEFAULT NULL,
  `USER_SESSION_ID` varchar(64) NOT NULL DEFAULT '0',
  `USER_IS_APPROVED` varchar(8) NOT NULL DEFAULT 'no',
  `USER_REGISTERED_ON` int(11) DEFAULT NULL,
  `USER_IS_BANNED` int(1) DEFAULT '0',
  `USER_IS_UNDERAGE` int(1) unsigned DEFAULT '0',
  `USER_RULES_ACCEPTED` int(11) unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`USER_ID`),
  KEY `indx1` (`USER_LOGIN_NAME`,`USER_PASSWORD`),
  KEY `indx2` (`USER_MEMBERSHIP_LEVEL`),
  KEY `sess_ndx` (`USER_SESSION_ID`),
  KEY `App_ndx` (`USER_IS_APPROVED`),
  KEY `Display_ndx` (`USER_DISPLAY_NAME`),
  KEY `time_ndx` (`USER_REGISTERED_ON`),
  KEY `reg_email_ndx` (`USER_REGISTRATION_EMAIL`)
) ENGINE=MyISAM  DEFAULT CHARSET=latin1 AUTO_INCREMENT=20910 ;

--
-- Dumping data for table `ubbt_USERS`
--

INSERT INTO `ubbt_USERS` (`USER_ID`, `USER_LOGIN_NAME`, `USER_DISPLAY_NAME`, `USER_PASSWORD`, `USER_MEMBERSHIP_LEVEL`, `USER_REGISTRATION_EMAIL`, `USER_REGISTRATION_IP`, `USER_SESSION_ID`, `USER_IS_APPROVED`, `USER_REGISTERED_ON`, `USER_IS_BANNED`, `USER_IS_UNDERAGE`, `USER_RULES_ACCEPTED`) VALUES
(1, '**DONOTDELETE**', '**DONOTDELETE**', 'badpass', 'User', NULL, NULL, '0', 'no', NULL, 0, 0, 0),
(2, 'user1', 'user1', '5F4DCC3B5AA765D61D8327DEB882CF99', 'Administrator', 'email_1@example.com', '127.0.0.1', '0', 'yes', 959878800, 0, 0, 0),
(3, 'user2', 'user2', '5F4DCC3B5AA765D61D8327DEB882CF99', 'User', 'email_2@example.com', '127.0.0.1', '0', 'yes', 960224400, 0, 0, 0),
(4, 'user3', 'user3', '5F4DCC3B5AA765D61D8327DEB882CF99', 'User', 'email_3@example.com', '127.0.0.1', '0', 'yes', 971110800, 0, 0, 0),
(5, 'user4', 'user4', '5F4DCC3B5AA765D61D8327DEB882CF99', 'Moderator', 'email_4@example.com', '127.0.0.1', '0', 'yes', 971456400, 0, 0, 0),
(6, 'user5', 'user5', '5F4DCC3B5AA765D61D8327DEB882CF99', 'User', 'email_5@example.com', '127.0.0.1', '0', 'yes', 971629200, 0, 0, 0),
(7, 'user6', 'user6', '5F4DCC3B5AA765D61D8327DEB882CF99', 'User', 'email_6@example.com', '127.0.0.1', '0', 'yes', 974829600, 0, 0, 0),
(8, 'user7', 'user7', '5F4DCC3B5AA765D61D8327DEB882CF99', 'Administrator', 'email_7@example.com', '127.0.0.1', '0', 'yes', 978112800, 0, 0, 0),
(9, 'user8', 'user8', '5F4DCC3B5AA765D61D8327DEB882CF99', 'User', 'email_8@example.com', '127.0.0.1', '0', 'yes', 982864800, 0, 0, 0),
(10, 'user9', 'user9', '5F4DCC3B5AA765D61D8327DEB882CF99', 'User', 'email_9@example.com', '127.0.0.1', '0', 'yes', 993834000, 0, 0, 0);

-- --------------------------------------------------------

--
-- Table structure for table `ubbt_USER_PROFILE`
--

CREATE TABLE IF NOT EXISTS `ubbt_USER_PROFILE` (
  `USER_ID` int(9) NOT NULL DEFAULT '0',
  `USER_REAL_EMAIL` varchar(50) NOT NULL DEFAULT '',
  `USER_DISPLAY_EMAIL` varchar(50) DEFAULT NULL,
  `USER_SIGNATURE` text,
  `USER_DEFAULT_SIGNATURE` text,
  `USER_HOMEPAGE` varchar(150) DEFAULT NULL,
  `USER_OCCUPATION` varchar(150) DEFAULT NULL,
  `USER_HOBBIES` varchar(200) DEFAULT NULL,
  `USER_LOCATION` varchar(200) DEFAULT NULL,
  `USER_START_VIEW` varchar(20) NOT NULL DEFAULT 'cfrm',
  `USER_FAVORITES_TAB` varchar(10) NOT NULL DEFAULT 'forums',
  `USER_FAVORITES_SORT` varchar(10) NOT NULL DEFAULT 'reply',
  `USER_TOPIC_VIEW_TYPE` varchar(10) NOT NULL DEFAULT 'flat',
  `USER_TOPICS_PER_PAGE` int(1) DEFAULT NULL,
  `USER_NOTIFY_ON_PM` char(3) NOT NULL DEFAULT 'no',
  `USER_ICQ` varchar(200) DEFAULT NULL,
  `USER_YAHOO` varchar(200) DEFAULT NULL,
  `USER_MSN` varchar(200) DEFAULT NULL,
  `USER_AIM` varchar(200) DEFAULT NULL,
  `USER_EXTRA_FIELD_1` varchar(200) DEFAULT NULL,
  `USER_EXTRA_FIELD_2` varchar(200) DEFAULT NULL,
  `USER_EXTRA_FIELD_3` varchar(200) DEFAULT NULL,
  `USER_EXTRA_FIELD_4` varchar(200) DEFAULT NULL,
  `USER_EXTRA_FIELD_5` varchar(200) DEFAULT NULL,
  `USER_AVATAR` varchar(150) DEFAULT NULL,
  `USER_SHOW_AVATARS` tinyint(1) NOT NULL DEFAULT '1',
  `USER_VISIBLE_ONLINE_STATUS` char(3) DEFAULT 'yes',
  `USER_ACCEPT_PM` char(3) DEFAULT 'yes',
  `USER_EMAIL_WATCHLISTS` tinyint(1) NOT NULL DEFAULT '0',
  `USER_TITLE` varchar(100) DEFAULT NULL,
  `USER_POSTS_PER_TOPIC` char(2) DEFAULT NULL,
  `USER_TEMPORARY_PASSWORD` varchar(32) DEFAULT NULL,
  `USER_NAME_COLOR` varchar(15) DEFAULT NULL,
  `USER_TIME_OFFSET` varchar(10) DEFAULT NULL,
  `USER_TOTAL_PM` int(4) DEFAULT '0',
  `USER_TOTAL_POSTS` int(9) DEFAULT '0',
  `USER_SHOW_SIGNATURES` char(3) DEFAULT NULL,
  `USER_RATING` int(1) DEFAULT NULL,
  `USER_TOTAL_RATES` mediumint(6) NOT NULL DEFAULT '0',
  `USER_AVATAR_WIDTH` int(4) DEFAULT '0',
  `USER_AVATAR_HEIGHT` int(4) DEFAULT '0',
  `USER_ACCEPT_ADMIN_EMAILS` char(3) DEFAULT NULL,
  `USER_BIRTHDAY` varchar(10) NOT NULL DEFAULT '0',
  `USER_PUBLIC_BIRTHDAY` int(1) NOT NULL DEFAULT '0',
  `USER_TIME_FORMAT` varchar(30) DEFAULT NULL,
  `USER_IGNORE_LIST` text,
  `USER_FLOOD_CONTROL_OVERRIDE` mediumint(8) DEFAULT '0',
  `USER_STYLE` mediumint(4) NOT NULL DEFAULT '0',
  `USER_UNAPPROVED_POST_NOTIFY` tinyint(1) NOT NULL DEFAULT '0',
  `USER_TEXT_EDITOR` varchar(10) DEFAULT 'standard',
  `USER_HIDE_LEFT_COLUMN` tinyint(1) NOT NULL DEFAULT '0',
  `USER_HIDE_RIGHT_COLUMN` tinyint(1) NOT NULL DEFAULT '0',
  `USER_CUSTOM_TITLE` varchar(255) DEFAULT NULL,
  `USER_LANGUAGE` varchar(50) DEFAULT NULL,
  `USER_MOOD` varchar(50) DEFAULT NULL,
  `USER_REPORT_POST_NOTIFY` tinyint(1) NOT NULL DEFAULT '0',
  `USER_RELATIVE_TIME` tinyint(1) DEFAULT NULL,
  `USER_NOTIFY_NEW_USER` tinyint(1) NOT NULL DEFAULT '0',
  `USER_POST_LAYOUT` varchar(4) DEFAULT NULL,
  `USER_SHOW_ALL_GRAEMLINS` tinyint(1) DEFAULT '0',
  `USER_SHOW_LEFT_MYSTUFF` tinyint(1) NOT NULL DEFAULT '0',
  `USER_UNVERIFIED_EMAIL` varchar(50) NOT NULL DEFAULT '',
  `USER_GROUP_IMAGES` varchar(255) DEFAULT NULL,
  `USER_NOTIFY_MULTI` tinyint(1) unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`USER_ID`),
  KEY `birthday_ndx` (`USER_BIRTHDAY`,`USER_PUBLIC_BIRTHDAY`),
  KEY `email_ndx` (`USER_REAL_EMAIL`),
  KEY `post_ndx` (`USER_TOTAL_POSTS`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

--
-- Dumping data for table `ubbt_USER_PROFILE`
--

INSERT INTO `ubbt_USER_PROFILE` (`USER_ID`, `USER_REAL_EMAIL`, `USER_DISPLAY_EMAIL`, `USER_SIGNATURE`, `USER_DEFAULT_SIGNATURE`, `USER_HOMEPAGE`, `USER_OCCUPATION`, `USER_HOBBIES`, `USER_LOCATION`, `USER_START_VIEW`, `USER_FAVORITES_TAB`, `USER_FAVORITES_SORT`, `USER_TOPIC_VIEW_TYPE`, `USER_TOPICS_PER_PAGE`, `USER_NOTIFY_ON_PM`, `USER_ICQ`, `USER_YAHOO`, `USER_MSN`, `USER_AIM`, `USER_EXTRA_FIELD_1`, `USER_EXTRA_FIELD_2`, `USER_EXTRA_FIELD_3`, `USER_EXTRA_FIELD_4`, `USER_EXTRA_FIELD_5`, `USER_AVATAR`, `USER_SHOW_AVATARS`, `USER_VISIBLE_ONLINE_STATUS`, `USER_ACCEPT_PM`, `USER_EMAIL_WATCHLISTS`, `USER_TITLE`, `USER_POSTS_PER_TOPIC`, `USER_TEMPORARY_PASSWORD`, `USER_NAME_COLOR`, `USER_TIME_OFFSET`, `USER_TOTAL_PM`, `USER_TOTAL_POSTS`, `USER_SHOW_SIGNATURES`, `USER_RATING`, `USER_TOTAL_RATES`, `USER_AVATAR_WIDTH`, `USER_AVATAR_HEIGHT`, `USER_ACCEPT_ADMIN_EMAILS`, `USER_BIRTHDAY`, `USER_PUBLIC_BIRTHDAY`, `USER_TIME_FORMAT`, `USER_IGNORE_LIST`, `USER_FLOOD_CONTROL_OVERRIDE`, `USER_STYLE`, `USER_UNAPPROVED_POST_NOTIFY`, `USER_TEXT_EDITOR`, `USER_HIDE_LEFT_COLUMN`, `USER_HIDE_RIGHT_COLUMN`, `USER_CUSTOM_TITLE`, `USER_LANGUAGE`, `USER_MOOD`, `USER_REPORT_POST_NOTIFY`, `USER_RELATIVE_TIME`, `USER_NOTIFY_NEW_USER`, `USER_POST_LAYOUT`, `USER_SHOW_ALL_GRAEMLINS`, `USER_SHOW_LEFT_MYSTUFF`, `USER_UNVERIFIED_EMAIL`, `USER_GROUP_IMAGES`, `USER_NOTIFY_MULTI`) VALUES
(1, '', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'cfrm', 'forums', 'reply', 'flat', NULL, 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 'yes', 'yes', 0, 'new member', NULL, NULL, NULL, NULL, 0, 0, NULL, NULL, 0, 0, 0, NULL, '0', 0, NULL, NULL, 0, 0, 0, 'standard', 0, 0, NULL, NULL, NULL, 0, NULL, 0, NULL, 0, 0, '', NULL, 0),
(2, 'email_1@example.com', '', '', '', '', '', '', '', 'cfrm', 'forums', 'reply', 'flat', 25, 'Off', '', '', '', '', 'M', '', '', '', '', '', 1, 'yes', 'no', 0, 'new member', '50', '', '', '1', 0, 28, 'yes', 4, 12, 90, 90, 'On', '//', 0, 'm/d/y | h:i A', NULL, 0, 0, 0, 'standard', 0, 0, NULL, NULL, NULL, 0, NULL, 0, NULL, 0, 0, '', 'a:1:{i:0;i:1;}', 0),
(3, 'email_2@example.com', '', '', '', '', '', '', '', 'cfrm', 'forums', 'reply', 'flat', 25, 'On', '', '', '', '', '', '', '', '', '', '', 1, 'yes', 'yes', 0, 'member', '50', '', '', '0', 0, 577, 'yes', 3, 9, 80, 80, 'On', '0', 0, 'm/d/y | h:i A', NULL, 0, 0, 0, 'standard', 0, 0, '', NULL, NULL, 0, NULL, 0, NULL, 0, 0, '', NULL, 0),
(4, 'email_3@example.com', '', '', '', '', '', '', '', 'cfrm', 'forums', 'reply', 'flat', 10, 'Off', '', '', '', '', 'Male', '', '', '', '', '', 1, 'yes', 'yes', 0, 'member', '50', '', '', '-3', 0, 771, 'yes', 3, 21, 90, 90, 'On', '', 1, 'm/d/y | h:i A', NULL, 0, 0, 0, 'standard', 0, 0, NULL, NULL, NULL, 0, NULL, 0, NULL, 0, 0, '', NULL, 0),
(5, 'email_4@example.com', '', '', '', '', '', '', '', 'cfrm', 'forums', 'reply', 'flat', 10, 'On', '', '', '', '', 'male', '', '', '', '', '', 1, 'yes', 'yes', 0, 'longstanding member', '10', '', '', '0', 0, 2609, 'yes', 3, 25, 0, 0, 'On', '//', 0, 'm/d/y | h:i A', NULL, 0, 0, 0, 'standard', 0, 0, NULL, NULL, NULL, 0, NULL, 0, NULL, 0, 0, '', NULL, 0),
(6, 'email_5@example.com', '', '', '', '', '', '', '', 'cfrm', 'forums', 'reply', 'flat', 10, 'Off', '', '', '', '', '', '', '', '', '', '', 1, 'yes', 'yes', 0, 'longstanding member', '10', '', '', '0', 4, 3236, 'yes', 4, 41, 0, 0, 'On', '0', 0, 'm/d/y | h:i A', NULL, 0, 0, 0, 'standard', 0, 0, NULL, NULL, NULL, 0, NULL, 0, NULL, 0, 0, '', NULL, 0),
(7, 'email_6@example.com', NULL, NULL, NULL, '', '', '', '', 'cfrm', 'forums', 'reply', 'flat', 20, 'no', NULL, NULL, NULL, NULL, 'Male', NULL, NULL, NULL, NULL, NULL, 1, 'yes', 'yes', 0, '', '50', '', NULL, '8', 1, 0, NULL, NULL, 0, 0, 0, '', '0', 0, 'm/d/y | h:i A', NULL, -1, 0, 0, 'standard', 0, 0, NULL, NULL, NULL, 0, NULL, 0, NULL, 0, 0, '', NULL, 0),
(8, 'email_7@example.com', '', '', '', '', '', '', '', 'cfrm', 'forums', 'reply', 'flat', 50, 'yes', '', '', '', '', 'Male', '', '', '', '', '', 1, 'yes', 'yes', 0, 'longstanding member', '75', '', '', '0', 0, 3963, 'yes', 4, 45, 90, 90, 'On', '', 0, 'm/d/y | h:i A', NULL, 0, 0, 0, 'standard', 0, 0, NULL, 'english', NULL, 0, 1, 0, NULL, 0, 0, '', NULL, 0),
(9, 'email_8@example.com', '', '', '', '', '', '', '', 'cfrm', 'forums', 'reply', 'flat', 25, 'no', '', '', '', '', 'Male', '', '', '', '', '', 1, 'yes', 'yes', 0, 'longstanding member', '99', '', 'blue', '-3', 0, 13745, 'yes', 1, 95, 90, 90, 'On', '', 0, 'D M d Y | h:i A', '-', 0, 2, 0, 'standard', 0, 0, '', 'english', NULL, 0, 0, 0, NULL, 0, 0, '', 'a:1:{i:0;i:1;}', 0),
(10, 'email_9@example.com', '', '', '', '', '', '', '', 'cfrm', 'forums', 'reply', 'flat', 10, 'Off', '', '', '', '', '', '', '', '', '', '', 1, 'yes', 'yes', 0, 'member', '50', '', '', '0', 1, 187, 'yes', 3, 4, 90, 90, 'On', '0', 0, 'm/d/y | h:i A', NULL, 0, 0, 0, 'standard', 0, 0, '', NULL, NULL, 0, NULL, 0, NULL, 0, 0, '', NULL, 0);

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
