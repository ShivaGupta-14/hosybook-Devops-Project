variable "aws_region" {
  type    = string
  default = "ap-south-1"
}

variable "environment" {
  type    = string
  default = "dev"
}

variable "cluster_name" {
  type    = string
  default = "hosybook-eks"
}

variable "cluster_version" {
  type    = string
  default = "1.31"
}

variable "vpc_cidr" {
  type    = string
  default = "10.30.0.0/16"
}

variable "node_instance_type" {
  type    = string
  default = "t3.small"
}

variable "node_count" {
  type    = number
  default = 2
}
