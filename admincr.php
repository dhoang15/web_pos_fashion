<?php 
require '../config/function.php'; // File chứa kết nối DB và các hàm dùng chung
include 'includes/header.php'; 
include 'includes/navbar.php'; 
?>

<div class="container-fluid px-4">
    <div class="card mt-4 shadow-sm">
        <div class="card-header">
            <h4 class="mb-0">Add Admin 
                <a href="admins.php" class="btn btn-primary float-end">Back</a>
            </h4>
        </div>
        <div class="card-body">
            <!-- Form đẩy dữ liệu sang file code.php bằng phương thức POST -->
            <form action="code.php" method="POST">
                <div class="row">
                    <div class="col-md-12 mb-3">
                        <label>Name *</label>
                        <input type="text" name="name" required class="form-control" />
                    </div>
                    
                    <div class="col-md-6 mb-3">
                        <label>Email *</label>
                        <input type="email" name="email" required class="form-control" />
                    </div>
                    
                    <div class="col-md-6 mb-3">
                        <label>Password *</label>
                        <input type="password" name="password" required class="form-control" />
                    </div>
                    
                    <div class="col-md-6 mb-3">
                        <label>Phone Number *</label>
                        <input type="text" name="phone" required class="form-control" />
                    </div>
                    
                    <div class="col-md-3 mb-3 text-start">
                        <label>Is Ban</label><br/>
                        <input type="checkbox" name="is_ban" style="width:30px;height:30px;" />
                    </div>
                    
                    <div class="col-md-12 mb-3 text-end">
                        <!-- Nút Submit phải có name="saveAdmin" để code.php nhận diện -->
                        <button type="submit" name="saveAdmin" class="btn btn-primary">Save</button>
                    </div>
                </div>
            </form>
        </div>
    </div>
</div>

<?php include 'includes/footer.php'; ?>